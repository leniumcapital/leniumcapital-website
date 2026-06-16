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
import {
  resolveTierForAccount,
  resolveRules,
  staticFloorForBalance,
  effectiveAccountSize,
  drawdownFloorUsd,
  adjustedProfitTargetUsd,
  drawdownPctFromEquity,
  equityUsd,
  profitByTicker,
} from "@/lib/rules";
import { MAX_DRAWDOWN_PCT, PROFIT_TARGET_PCT } from "@/lib/data";

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
    {
      name: "lenium-challenge",
      version: 2,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        normalizePersistedChallengeRules(state);
        queueMicrotask(() => syncChallengeRuleLimits());
      },
    },
  ),
);

/**
 * Recompute rule limits from the current account state and write them into the
 * challenge store. Safe to call for every account type, on hydrate, and after
 * account status loads.
 */
export function syncChallengeRuleLimits(): void {
  const account = useAccountStore.getState();
  const size = effectiveAccountSize({
    accountSize: account.accountSize,
    tier: account.tier,
    challengeTier: account.challengeTier,
    fundedTier: account.fundedTier,
    tradingMode: account.tradingMode,
  });
  if (size <= 0 || account.accountType === "none") return;

  const tier = resolveTierForAccount(size);
  if (!tier) return;

  const phase = account.accountType === "funded" ? "funded" : "evaluation";
  const rules = resolveRules({
    tier,
    addons: account.addons,
    phase,
    currentBalance: size,
  });

  const challenge = useChallengeStore.getState();
  const windowStart = challenge.windowStartDate || new Date().toISOString();
  const end = new Date(windowStart);
  end.setDate(end.getDate() + rules.windowDays);

  const staticFloor = staticFloorForBalance(size, rules.maxDrawdownPct);
  const hwm = Math.max(challenge.highWaterMarkUsd, size);
  const floor = drawdownFloorUsd({
    rules,
    startingBalance: size,
    highWaterMarkUsd: hwm,
    staticFloorUsd: staticFloor,
  });

  const adjustedTarget = Math.max(
    challenge.adjustedProfitTarget > rules.profitTargetUsd
      ? challenge.adjustedProfitTarget
      : rules.profitTargetUsd,
    rules.profitTargetUsd,
  );

  challenge.updateProgress({
    profitTarget: rules.profitTargetUsd,
    adjustedProfitTarget: adjustedTarget,
    maxDrawdown: rules.maxDrawdownPct,
    staticFloorUsd: staticFloor,
    drawdownFloorUsd: floor,
    highWaterMarkUsd: hwm,
    windowStartDate: windowStart,
    windowEndDate: end.toISOString(),
    peakBalance: Math.max(challenge.peakBalance, size),
  });

  // Keep accountSize aligned when only tier fields were populated.
  if (account.accountSize !== size) {
    const patch: { accountSize: number; tier?: number } = { accountSize: size };
    if (!account.tier) patch.tier = size;
    useAccountStore.getState().setAccount(patch);
  }
}

/** Normalize stale persisted rule limits left from older frameworks. */
export function normalizePersistedChallengeRules(state: ChallengeState): void {
  if (state.maxDrawdown > 0 && state.maxDrawdown < MAX_DRAWDOWN_PCT - 0.5) {
    state.maxDrawdown = MAX_DRAWDOWN_PCT;
  }
  if (state.maxDrawdown > MAX_DRAWDOWN_PCT + 0.5 && state.maxDrawdown < 14.5) {
    state.maxDrawdown = MAX_DRAWDOWN_PCT;
  }
  const account = useAccountStore.getState();
  const size = effectiveAccountSize({
    accountSize: account.accountSize,
    tier: account.tier,
    challengeTier: account.challengeTier,
    fundedTier: account.fundedTier,
    tradingMode: account.tradingMode,
  });
  if (size > 0) {
    const expectedTarget = Math.round((size * PROFIT_TARGET_PCT) / 100);
    if (state.profitTarget > 0 && Math.abs(state.profitTarget - expectedTarget) > 1) {
      state.profitTarget = expectedTarget;
      if (state.adjustedProfitTarget < expectedTarget) {
        state.adjustedProfitTarget = expectedTarget;
      }
    }
    state.staticFloorUsd = staticFloorForBalance(size, MAX_DRAWDOWN_PCT);
  }
}

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
    const size = effectiveAccountSize({
      accountSize: account.accountSize,
      tier: account.tier,
      challengeTier: account.challengeTier,
      fundedTier: account.fundedTier,
      tradingMode: account.tradingMode,
    });
    if (size <= 0 || account.accountType === "none") return;

    const tier = resolveTierForAccount(size);
    if (!tier) return;

    const phase =
      account.accountType === "funded" ? "funded" : "evaluation";
    const rules = resolveRules({
      tier,
      addons: account.addons,
      phase,
      currentBalance: size,
    });

    const realized = positionState.closedTrades.reduce(
      (sum: number, t: ClosedTrade) => sum + t.pnl,
      0,
    );
    const unrealized = totalOpenPnl(positionState.positions);
    const currentProfit = realized + unrealized;
    const equity = equityUsd(size, currentProfit);

    const snapshots = openSnapshots(positionState.positions, getPrice);
    const byTicker = profitByTicker(positionState.closedTrades, snapshots);

    const baseTarget = rules.profitTargetUsd;
    const adjustedTarget = adjustedProfitTargetUsd(
      baseTarget,
      byTicker,
      rules.consistencyCapPct,
    );

    const challenge = useChallengeStore.getState();
    const starting = size;

    const staticFloor = staticFloorForBalance(
      starting,
      rules.maxDrawdownPct,
    );

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
