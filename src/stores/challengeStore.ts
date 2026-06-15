import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist } from "zustand/middleware";
import {
  usePositionStore,
  totalOpenPnl,
  type ClosedTrade,
  type Position,
} from "@/stores/positionStore";
import { useAccountStore } from "@/stores/accountStore";
import { findTier, resolveRules } from "@/lib/rules";
import {
  adjustedProfitTargetUsd,
  drawdownFloorUsd,
  drawdownPctFromEquity,
  equityUsd,
  profitByTicker,
} from "@/lib/rules";

interface ChallengeState {
  profitTarget: number;
  adjustedProfitTarget: number;
  currentProfit: number;
  maxDrawdown: number;
  currentDrawdown: number;
  peakBalance: number;
  highWaterMarkUsd: number;
  staticFloorUsd: number;
  drawdownFloorUsd: number;
  daysTraded: number;
  tradedDates: string[];
  windowStartDate: string;
  windowEndDate: string;
  updateProgress: (
    progress: Partial<
      Pick<
        ChallengeState,
        | "profitTarget"
        | "adjustedProfitTarget"
        | "currentProfit"
        | "maxDrawdown"
        | "currentDrawdown"
        | "peakBalance"
        | "highWaterMarkUsd"
        | "staticFloorUsd"
        | "drawdownFloorUsd"
        | "daysTraded"
        | "windowStartDate"
        | "windowEndDate"
      >
    >,
  ) => void;
  addTradedDate: (isoDate: string) => void;
  updateDrawdown: (currentDrawdown: number, peakBalance: number) => void;
  reset: () => void;
}

const initial = {
  profitTarget: 0,
  adjustedProfitTarget: 0,
  currentProfit: 0,
  maxDrawdown: 0,
  currentDrawdown: 0,
  peakBalance: 0,
  highWaterMarkUsd: 0,
  staticFloorUsd: 0,
  drawdownFloorUsd: 0,
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

/** Build open-position snapshots with live prices for rule calculations. */
function openSnapshots(
  positions: Record<string, Position>,
  priceFor: (ticker: string, direction: "yes" | "no", entry: number) => number,
) {
  return Object.values(positions).map((p) => ({
    marketTicker: p.marketTicker,
    size: p.size,
    entryPrice: p.entryPrice,
    direction: p.direction,
    currentPrice: priceFor(p.marketTicker, p.direction, p.entryPrice),
  }));
}

/**
 * Recalculate profit, consistency-adjusted target, and drawdown whenever
 * positions change.
 */
export function subscribeChallengeToPositions(
  priceFor?: (ticker: string, direction: "yes" | "no", entry: number) => number,
): () => void {
  const getPrice =
    priceFor ??
    ((_ticker, _dir, entry) => entry);

  return usePositionStore.subscribe((positionState) => {
    const account = useAccountStore.getState();
    if (account.accountSize <= 0) return;

    const tier = findTier(account.accountSize);
    if (!tier) return;

    const phase =
      account.accountType === "funded" ? "funded" : "evaluation";
    const rules = resolveRules({
      tier,
      addons: account.addons,
      phase,
      currentBalance: account.accountSize,
    });

    const realized = positionState.closedTrades.reduce(
      (sum: number, t: ClosedTrade) => sum + t.pnl,
      0,
    );
    const unrealized = totalOpenPnl(positionState.positions);
    const currentProfit = realized + unrealized;
    const equity = equityUsd(account.accountSize, currentProfit);

    const snapshots = openSnapshots(positionState.positions, getPrice);
    const byTicker = profitByTicker(positionState.closedTrades, snapshots);

    const baseTarget = rules.profitTargetUsd;
    const adjustedTarget = adjustedProfitTargetUsd(
      baseTarget,
      byTicker,
      rules.consistencyCapPct,
    );

    const challenge = useChallengeStore.getState();
    const starting = account.accountSize;

    const staticFloor =
      challenge.staticFloorUsd > 0
        ? challenge.staticFloorUsd
        : Math.round(starting * (1 - rules.maxDrawdownPct / 100));

    const hwm = Math.max(
      challenge.highWaterMarkUsd,
      starting,
      equity,
      challenge.peakBalance,
    );

    const floor = drawdownFloorUsd({
      rules,
      startingBalance: starting,
      highWaterMarkUsd: hwm,
      staticFloorUsd: staticFloor,
    });

    const currentDrawdown = drawdownPctFromEquity({
      rules,
      startingBalance: starting,
      equity,
      highWaterMarkUsd: hwm,
    });

    challenge.updateProgress({
      currentProfit,
      profitTarget: baseTarget,
      adjustedProfitTarget: adjustedTarget,
      maxDrawdown: rules.maxDrawdownPct,
      peakBalance: Math.max(challenge.peakBalance, equity, starting),
      highWaterMarkUsd: hwm,
      staticFloorUsd: staticFloor,
      drawdownFloorUsd: floor,
    });
    challenge.updateDrawdown(Math.max(0, currentDrawdown), equity);
  });
}
