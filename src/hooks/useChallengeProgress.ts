"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAccountStore } from "@/stores/accountStore";
import {
  useChallengeStore,
  subscribeChallengeToPositions,
} from "@/stores/challengeStore";
import { TIERS } from "@/lib/data";

export type ChallengeProgress = {
  profitTarget: number;
  currentProfit: number;
  profitPct: number;
  maxDrawdown: number;
  currentDrawdown: number;
  drawdownConsumedPct: number;
  minTradingDays: number;
  daysTraded: number;
  tradedDates: string[];
  windowStartDate: string;
  windowEndDate: string;
  daysRemaining: number;
  hoursRemaining: number;
  windowDays: number;
  dailyLossLimit: number;
};

/**
 * Initialize challenge parameters from the user's tier and keep progress in
 * sync with positions. Mounted once in the dashboard layout.
 */
export function useChallengeSync(): void {
  const tierSize = useAccountStore((s) => s.tier);
  const accountType = useAccountStore((s) => s.accountType);

  useEffect(() => {
    if (!tierSize || accountType === "none") return;
    const tier = TIERS.find((t) => t.size === tierSize);
    if (!tier) return;

    const challenge = useChallengeStore.getState();
    const windowStart = challenge.windowStartDate || new Date().toISOString();
    const end = new Date(windowStart);
    end.setDate(end.getDate() + tier.windowDays);

    challenge.updateProgress({
      profitTarget: Math.round((tier.size * tier.profitTargetPct) / 100),
      maxDrawdown: tier.maxDrawdownPct,
      minTradingDays: tier.minTradingDays,
      windowStartDate: windowStart,
      windowEndDate: challenge.windowEndDate || end.toISOString(),
      dailyLossLimit: Math.round((tier.size * tier.dailyLimitPct) / 100),
      peakBalance: Math.max(challenge.peakBalance, tierSize),
    });
  }, [tierSize, accountType]);

  useEffect(() => {
    const unsubscribe = subscribeChallengeToPositions();
    return unsubscribe;
  }, []);
}

// Clock treated as an external store, sampled at minute resolution so the
// snapshot stays stable between renders (satisfies render purity).
function subscribeMinute(callback: () => void): () => void {
  const id = setInterval(callback, 60_000);
  return () => clearInterval(id);
}
const getMinuteNow = () => Math.floor(Date.now() / 60_000) * 60_000;
const getServerNow = () => 0;

function useMinuteNow(): number {
  return useSyncExternalStore(subscribeMinute, getMinuteNow, getServerNow);
}

/** Derived, render-ready challenge progress. */
export function useChallengeProgress(): ChallengeProgress {
  const challenge = useChallengeStore(
    useShallow((s) => ({
      profitTarget: s.profitTarget,
      currentProfit: s.currentProfit,
      maxDrawdown: s.maxDrawdown,
      currentDrawdown: s.currentDrawdown,
      minTradingDays: s.minTradingDays,
      daysTraded: s.daysTraded,
      tradedDates: s.tradedDates,
      windowStartDate: s.windowStartDate,
      windowEndDate: s.windowEndDate,
    })),
  );
  const tierSize = useAccountStore((s) => s.tier);
  const tier = TIERS.find((t) => t.size === tierSize);

  const now = useMinuteNow();
  const remainingMs = useMemo(
    () =>
      challenge.windowEndDate && now > 0
        ? Math.max(0, new Date(challenge.windowEndDate).getTime() - now)
        : 0,
    [challenge.windowEndDate, now],
  );

  return {
    ...challenge,
    profitPct:
      challenge.profitTarget > 0
        ? Math.min(100, Math.max(0, (challenge.currentProfit / challenge.profitTarget) * 100))
        : 0,
    drawdownConsumedPct:
      challenge.maxDrawdown > 0
        ? Math.min(100, Math.max(0, (challenge.currentDrawdown / challenge.maxDrawdown) * 100))
        : 0,
    daysRemaining: Math.floor(remainingMs / 86_400_000),
    hoursRemaining: Math.floor((remainingMs % 86_400_000) / 3_600_000),
    windowDays: tier?.windowDays ?? 45,
    dailyLossLimit: tier
      ? Math.round((tier.size * tier.dailyLimitPct) / 100)
      : 0,
  };
}
