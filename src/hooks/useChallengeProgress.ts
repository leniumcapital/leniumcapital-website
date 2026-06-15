"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAccountStore } from "@/stores/accountStore";
import {
  useChallengeStore,
  subscribeChallengeToPositions,
} from "@/stores/challengeStore";
import { useMarketStore } from "@/stores/marketStore";
import { findTier, resolveRules } from "@/lib/rules";

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
  const tierSize = useAccountStore((s) => s.tier);
  const accountSize = useAccountStore((s) => s.accountSize);
  const accountType = useAccountStore((s) => s.accountType);
  const addons = useAccountStore((s) => s.addons);

  useEffect(() => {
    if (!tierSize || accountType === "none") return;
    const tier = findTier(tierSize);
    if (!tier) return;

    const phase =
      accountType === "funded" ? "funded" : "evaluation";
    const rules = resolveRules({ tier, addons, phase });

    const challenge = useChallengeStore.getState();
    const windowStart = challenge.windowStartDate || new Date().toISOString();
    const end = new Date(windowStart);
    end.setDate(end.getDate() + rules.windowDays);

    const staticFloor = Math.round(
      (accountSize || tier.size) * (1 - rules.maxDrawdownPct / 100),
    );

    challenge.updateProgress({
      profitTarget: rules.profitTargetUsd,
      adjustedProfitTarget: rules.profitTargetUsd,
      maxDrawdown: rules.maxDrawdownPct,
      staticFloorUsd: challenge.staticFloorUsd || staticFloor,
      highWaterMarkUsd: Math.max(
        challenge.highWaterMarkUsd,
        accountSize || tier.size,
      ),
      windowStartDate: windowStart,
      windowEndDate: challenge.windowEndDate || end.toISOString(),
      peakBalance: Math.max(challenge.peakBalance, accountSize || tier.size),
    });
  }, [tierSize, accountSize, accountType, addons]);

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
  const tierSize = useAccountStore((s) => s.tier);
  const addons = useAccountStore((s) => s.addons);
  const accountType = useAccountStore((s) => s.accountType);
  const tier = findTier(tierSize);

  const phase = accountType === "funded" ? "funded" : "evaluation";
  const rules = tier
    ? resolveRules({ tier, addons, phase })
    : null;

  const now = useMinuteNow();
  const remainingMs = useMemo(
    () =>
      challenge.windowEndDate && now > 0
        ? Math.max(0, new Date(challenge.windowEndDate).getTime() - now)
        : 0,
    [challenge.windowEndDate, now],
  );

  const target =
    challenge.adjustedProfitTarget > 0
      ? challenge.adjustedProfitTarget
      : challenge.profitTarget;

  return {
    ...challenge,
    adjustedProfitTarget: target,
    profitPct:
      target > 0
        ? Math.min(100, Math.max(0, (challenge.currentProfit / target) * 100))
        : 0,
    drawdownConsumedPct:
      challenge.maxDrawdown > 0
        ? Math.min(
            100,
            Math.max(0, (challenge.currentDrawdown / challenge.maxDrawdown) * 100),
          )
        : 0,
    drawdownMode: rules?.drawdownMode ?? "static",
    daysRemaining: Math.floor(remainingMs / 86_400_000),
    hoursRemaining: Math.floor((remainingMs % 86_400_000) / 3_600_000),
    windowDays: rules?.windowDays ?? 30,
    consistencyCapPct: rules?.consistencyCapPct ?? 15,
  };
}
