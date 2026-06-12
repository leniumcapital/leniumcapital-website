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
  minTradingDays: number;
  daysTraded: number;
  /** ISO dates (YYYY-MM-DD, UTC) on which the user traded. */
  tradedDates: string[];
  windowStartDate: string;
  windowEndDate: string;
  /** Daily loss limit, percent of account size. */
  dailyLossLimit: number;
  updateProgress: (
    progress: Partial<
      Pick<
        ChallengeState,
        | "profitTarget"
        | "currentProfit"
        | "maxDrawdown"
        | "currentDrawdown"
        | "peakBalance"
        | "minTradingDays"
        | "daysTraded"
        | "windowStartDate"
        | "windowEndDate"
        | "dailyLossLimit"
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
  minTradingDays: 0,
  daysTraded: 0,
  tradedDates: [] as string[],
  windowStartDate: "",
  windowEndDate: "",
  dailyLossLimit: 0,
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
    const peakBalance = Math.max(challenge.peakBalance, equity, account.accountSize);
    const currentDrawdown =
      peakBalance > 0 ? ((peakBalance - equity) / peakBalance) * 100 : 0;

    challenge.updateProgress({ currentProfit, peakBalance });
    challenge.updateDrawdown(Math.max(0, currentDrawdown), peakBalance);
  });
}
