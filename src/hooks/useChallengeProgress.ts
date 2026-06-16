"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAccountStore } from "@/stores/accountStore";
import {
  useChallengeStore,
  subscribeChallengeToPositions,
  syncChallengeRuleLimits,
} from "@/stores/challengeStore";
import { useMarketStore } from "@/stores/marketStore";
import {
  effectiveAccountSize,
  resolveRulesForAccount,
  staticFloorForBalance,
  formatRulePct,
} from "@/lib/rules";
import { MAX_DRAWDOWN_PCT, PROFIT_TARGET_PCT } from "@/lib/data";

export type ChallengeProgress = {
  profitTarget: number;
  adjustedProfitTarget: number;
  currentProfit: number;
  profitPct: number;
  maxDrawdown: number;
  currentDrawdown: number;
  drawdownConsumedPct: number;
  staticFloorUsd: number;
  drawdownFloorUsd: number;
  highWaterMarkUsd: number;
  drawdownMode: "static" | "trailing";
  daysTraded: number;
  tradedDates: string[];
  windowStartDate: string;
  windowEndDate: string;
  daysRemaining: number;
  hoursRemaining: number;
  windowDays: number;
  consistencyCapPct: number;
};

export function useChallengeSync(): void {
  const accountSize = useAccountStore((s) => s.accountSize);
  const tier = useAccountStore((s) => s.tier);
  const challengeTier = useAccountStore((s) => s.challengeTier);
  const fundedTier = useAccountStore((s) => s.fundedTier);
  const tradingMode = useAccountStore((s) => s.tradingMode);
  const accountType = useAccountStore((s) => s.accountType);
  const addons = useAccountStore((s) => s.addons);
  const challengeStatus = useAccountStore((s) => s.challengeStatus);

  useEffect(() => {
    syncChallengeRuleLimits();
  }, [
    accountSize,
    tier,
    challengeTier,
    fundedTier,
    tradingMode,
    accountType,
    addons,
    challengeStatus,
  ]);

  useEffect(() => {
    const unsubscribe = subscribeChallengeToPositions((ticker, direction, entry) => {
      const market = useMarketStore.getState().markets[ticker];
      if (!market) return entry;
      return direction === "yes" ? market.yesPrice : market.noPrice;
    });
    return unsubscribe;
  }, []);
}

function subscribeMinute(callback: () => void): () => void {
  const id = setInterval(callback, 60_000);
  return () => clearInterval(id);
}
const getMinuteNow = () => Math.floor(Date.now() / 60_000) * 60_000;
const getServerNow = () => 0;

export function useMinuteNow(): number {
  return useSyncExternalStore(subscribeMinute, getMinuteNow, getServerNow);
}

export function useChallengeProgress(): ChallengeProgress {
  const challenge = useChallengeStore(
    useShallow((s) => ({
      profitTarget: s.profitTarget,
      adjustedProfitTarget: s.adjustedProfitTarget,
      currentProfit: s.currentProfit,
      maxDrawdown: s.maxDrawdown,
      currentDrawdown: s.currentDrawdown,
      staticFloorUsd: s.staticFloorUsd,
      drawdownFloorUsd: s.drawdownFloorUsd,
      highWaterMarkUsd: s.highWaterMarkUsd,
      daysTraded: s.daysTraded,
      tradedDates: s.tradedDates,
      windowStartDate: s.windowStartDate,
      windowEndDate: s.windowEndDate,
    })),
  );

  const account = useAccountStore(
    useShallow((s) => ({
      accountSize: s.accountSize,
      tier: s.tier,
      challengeTier: s.challengeTier,
      fundedTier: s.fundedTier,
      tradingMode: s.tradingMode,
      accountType: s.accountType,
      addons: s.addons,
    })),
  );

  const size = effectiveAccountSize(account);
  const rules = resolveRulesForAccount({
    accountSize: size,
    accountType: account.accountType,
    addons: account.addons,
  });

  const now = useMinuteNow();
  const remainingMs = useMemo(
    () =>
      challenge.windowEndDate && now > 0
        ? Math.max(0, new Date(challenge.windowEndDate).getTime() - now)
        : 0,
    [challenge.windowEndDate, now],
  );

  const profitTargetUsd =
    rules?.profitTargetUsd ??
    (size > 0 ? Math.round((size * PROFIT_TARGET_PCT) / 100) : 0);

  const maxDrawdownPct = rules?.maxDrawdownPct ?? MAX_DRAWDOWN_PCT;

  const staticFloor =
    size > 0
      ? staticFloorForBalance(size, maxDrawdownPct)
      : challenge.staticFloorUsd;

  const adjustedTarget = Math.max(
    challenge.adjustedProfitTarget > 0
      ? challenge.adjustedProfitTarget
      : profitTargetUsd,
    profitTargetUsd,
  );

  const currentDrawdown = Math.max(
    0,
    Number(formatRulePct(challenge.currentDrawdown)),
  );

  return {
    ...challenge,
    profitTarget: profitTargetUsd,
    adjustedProfitTarget: adjustedTarget,
    maxDrawdown: maxDrawdownPct,
    currentDrawdown,
    staticFloorUsd: staticFloor,
    profitPct:
      adjustedTarget > 0
        ? Math.min(
            100,
            Math.max(0, (challenge.currentProfit / adjustedTarget) * 100),
          )
        : 0,
    drawdownConsumedPct:
      maxDrawdownPct > 0
        ? Math.min(
            100,
            Math.max(0, (currentDrawdown / maxDrawdownPct) * 100),
          )
        : 0,
    drawdownMode: rules?.drawdownMode ?? "static",
    daysRemaining: Math.floor(remainingMs / 86_400_000),
    hoursRemaining: Math.floor((remainingMs % 86_400_000) / 3_600_000),
    windowDays: rules?.windowDays ?? 30,
    consistencyCapPct: rules?.consistencyCapPct ?? 15,
  };
}
