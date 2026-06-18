"use client";

import { toast } from "sonner";
import { markOnboardingDone } from "@/components/dashboard/DashboardOnboardingModal";
import { useAccountStore } from "@/stores/accountStore";
import { useChallengeStore } from "@/stores/challengeStore";
import { usd } from "@/lib/pricing";

export type StartDemoAccountResult =
  | { ok: true; tier: number; balance: number; accountId: string }
  | { ok: false; error: string };

/** Create a free demo challenge account via the purchase API. */
export async function startDemoAccount(tierSize: number): Promise<StartDemoAccountResult> {
  let res: Response;
  try {
    res = await fetch("/api/challenges/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      body: JSON.stringify({ tierSize, addons: [], demo: true }),
    });
  } catch {
    return {
      ok: false,
      error: "Network error — check your connection and try again.",
    };
  }

  let data: {
    error?: string;
    tier?: number;
    balance?: number;
    accountId?: string;
  } = {};

  try {
    data = (await res.json()) as typeof data;
  } catch {
    return {
      ok: false,
      error: `Server error (${res.status}). Please try again.`,
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: data.error ?? `Could not start demo account (${res.status}).`,
    };
  }

  if (data.tier == null || data.balance == null || !data.accountId) {
    return { ok: false, error: "Invalid server response. Please try again." };
  }

  return {
    ok: true,
    tier: data.tier,
    balance: data.balance,
    accountId: data.accountId,
  };
}

export function applyDemoAccountLocally(result: {
  tier: number;
  balance: number;
  accountId: string;
}): void {
  useAccountStore.getState().setAccount({
    accountType: "challenge",
    challengeStatus: "active",
    tier: result.tier,
    balance: result.balance,
    accountSize: result.tier,
    challengeTier: result.tier,
  });
  useAccountStore.getState().applyAccountStatus({
    hasActiveChallenge: true,
    challengeTier: result.tier,
    challengeBalance: result.balance,
    challengeAccountId: result.accountId,
    tradingMode: "demo",
  });

  try {
    useChallengeStore.getState().reset();
  } catch (e) {
    console.warn("Challenge store reset failed:", e);
  }
}

export async function refreshSessionAfterDemoStart(
  update: (data?: Record<string, unknown>) => Promise<unknown>,
  result: { tier: number; balance: number },
): Promise<void> {
  try {
    await update({
      tier: result.tier,
      balance: result.balance,
      accountType: "challenge",
      challengeStatus: "in_progress",
      hasActiveChallenge: true,
    });
  } catch (e) {
    console.warn("Session refresh after demo start failed:", e);
  }
}

export function finishDemoAccountStart(
  tier: number,
  onComplete?: () => void,
): void {
  toast.success(`${usd(tier)} demo account ready — start trading!`);
  markOnboardingDone();
  onComplete?.();
}
