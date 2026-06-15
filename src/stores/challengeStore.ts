import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist } from "zustand/middleware";
import {
  usePositionStore,
  totalOpenPnl,
  type ClosedTrade,
} from "@/stores/positionStore";
import { useAccountStore } from "@/stores/accountStore";

interface ChallengeState {
  /** Dollar profit required to pass. */
  profitTarget: number;
  /** Current realized + unrealized profit in dollars. */
  currentProfit: number;
  /** Max drawdown allowed, percent of account size. */
  maxDrawdown: number;
  /** Current drawdown from peak, percent. */
  currentDrawdown: number;
  /** Highest balance reached, dollars. */
  peakBalance: number;
  /** Static drawdown floor in dollars (set at account activation). */
  staticFloorUsd: number;
  daysTraded: number;
  tradedDates: string[];
  windowStartDate: string;
  windowEndDate: string;
  updateProgress: (
    progress: Partial<
      Pick<
        ChallengeState,
        | "profitTarget"
        | "currentProfit"
        | "maxDrawdown"
        | "currentDrawdown"
        | "peakBalance"
        | "daysTraded"
        | "windowStartDate"
        | "windowEndDate"
        | "staticFloorUsd"
      >
    >,
  ) => void;
  addTradedDate: (isoDate: string) => void;
  updateDrawdown: (currentDrawdown: number, peakBalance: number) => void;
  reset: () => void;
}

const initial = {
  profitTarget: 0,
  currentProfit: 0,
  maxDrawdown: 0,
  currentDrawdown: 0,
  peakBalance: 0,
  staticFloorUsd: 0,
  daysTraded: 0,
  tradedDates: [] as string[],
  windowStartDate: "",
  windowEndDate: "",
};

export const useChallengeStore = create<ChallengeState>()(
  persist(
    immer((set) => ({
      ...initial,

      updateProgress: (progress) => set(progress),

      addTradedDate: (isoDate) =>
        set((s) => {
          if (!s.tradedDates.includes(isoDate)) {
            s.tradedDates.push(isoDate);
            s.daysTraded = s.tradedDates.length;
          }
        }),

      updateDrawdown: (currentDrawdown, peakBalance) =>
        set({ currentDrawdown, peakBalance }),

      reset: () => set(initial),
    })),
    { name: "lenium-challenge" },
  ),
);

/**
 * Recalculate profit and drawdown whenever positions change. Subscribed once
 * from the dashboard layout — kept out of module scope so SSR never runs it.
 */
export function subscribeChallengeToPositions(): () => void {
  return usePositionStore.subscribe((positionState) => {
    const account = useAccountStore.getState();
    if (account.accountSize <= 0) return;

    const realized = positionState.closedTrades.reduce(
      (sum: number, t: ClosedTrade) => sum + t.pnl,
      0,
    );
    const unrealized = totalOpenPnl(positionState.positions);
    const currentProfit = realized + unrealized;

    const challenge = useChallengeStore.getState();
    const equity = account.accountSize + currentProfit;
    const starting = account.accountSize;
    const floor =
      challenge.staticFloorUsd > 0
        ? challenge.staticFloorUsd
        : starting * (1 - challenge.maxDrawdown / 100);
    const currentDrawdown =
      starting > 0 ? Math.max(0, ((starting - equity) / starting) * 100) : 0;

    challenge.updateProgress({
      currentProfit,
      peakBalance: Math.max(challenge.peakBalance, equity, starting),
      staticFloorUsd: floor,
    });
    challenge.updateDrawdown(Math.max(0, currentDrawdown), equity);
  });
}
