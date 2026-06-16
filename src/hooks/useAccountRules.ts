"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAccountStore } from "@/stores/accountStore";
import { useChallengeStore } from "@/stores/challengeStore";
import {
  usePositionStore,
  totalOpenExposure,
  totalOpenPnl,
} from "@/stores/positionStore";
import {
  resolveTierForAccount,
  resolveRules,
  effectiveAccountSize,
  equityUsd,
  type ResolvedRules,
} from "@/lib/rules";

export type AccountRulesState = {
  rules: ResolvedRules | null;
  tier: ReturnType<typeof resolveTierForAccount>;
  currentBalance: number;
  currentProfit: number;
  equity: number;
  totalExposure: number;
  remainingExposure: number;
  remainingPosition: number;
  canTrade: boolean;
  tradingBlockedReason: string | null;
};

export function useAccountRules(): AccountRulesState {
  const account = useAccountStore(
    useShallow((s) => ({
      accountType: s.accountType,
      accountSize: s.accountSize,
      tier: s.tier,
      challengeTier: s.challengeTier,
      fundedTier: s.fundedTier,
      tradingMode: s.tradingMode,
      addons: s.addons,
      challengeStatus: s.challengeStatus,
    })),
  );

  const closedTrades = usePositionStore((s) => s.closedTrades);
  const positions = usePositionStore((s) => s.positions);
  const challenge = useChallengeStore(
    useShallow((s) => ({
      currentProfit: s.currentProfit,
      windowEndDate: s.windowEndDate,
    })),
  );

  return useMemo(() => {
    const size = effectiveAccountSize(account);
    const tier = resolveTierForAccount(size);
    if (!tier || account.accountType === "none") {
      return {
        rules: null,
        tier: undefined,
        currentBalance: 0,
        currentProfit: 0,
        equity: 0,
        totalExposure: 0,
        remainingExposure: 0,
        remainingPosition: 0,
        canTrade: false,
        tradingBlockedReason: "No active account",
      };
    }

    const realized = closedTrades.reduce((s, t) => s + t.pnl, 0);
    const unrealized = totalOpenPnl(positions);
    const currentProfit = realized + unrealized;
    const equity = equityUsd(size, currentProfit);

    const phase =
      account.accountType === "funded" ? "funded" : "evaluation";
    const rules = resolveRules({
      tier,
      addons: account.addons,
      phase,
      currentBalance: equity,
    });

    const exposure = totalOpenExposure(positions);

    let tradingBlockedReason: string | null = null;
    if (account.challengeStatus === "breached") {
      tradingBlockedReason = "Account breached";
    } else if (account.challengeStatus === "expired") {
      tradingBlockedReason = "Challenge expired";
    } else if (account.challengeStatus === "passed" && account.accountType === "challenge") {
      tradingBlockedReason = "Challenge passed — activate funded account";
    }

    return {
      rules,
      tier,
      currentBalance: equity,
      currentProfit,
      equity,
      totalExposure: exposure,
      remainingExposure: Math.max(0, rules.maxExposureUsd - exposure),
      remainingPosition: rules.maxPositionUsd,
      canTrade: !tradingBlockedReason && account.challengeStatus === "active",
      tradingBlockedReason,
    };
  }, [
    account.accountType,
    account.accountSize,
    account.tier,
    account.challengeTier,
    account.fundedTier,
    account.tradingMode,
    account.addons,
    account.challengeStatus,
    closedTrades,
    positions,
    challenge.currentProfit,
    challenge.windowEndDate,
  ]);
}
