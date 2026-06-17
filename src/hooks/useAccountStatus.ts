"use client";

import { useEffect, useState } from "react";
import { useAccountStore } from "@/stores/accountStore";
import { syncChallengeRuleLimits } from "@/stores/challengeStore";
import { reconcileCashBalance } from "@/lib/accountBalance";
import type { AccountStatusPayload } from "@/lib/account-status";

/** Fetch /api/account/status once on dashboard mount and hydrate the store. */
export function useAccountStatusSync(): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/account/status");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as AccountStatusPayload;
        if (cancelled) return;
        useAccountStore.getState().applyAccountStatus(data);
        syncChallengeRuleLimits();
        reconcileCashBalance();
      } catch {
        // Session layout already seeded basics; status is best-effort.
        syncChallengeRuleLimits();
        reconcileCashBalance();
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return loaded;
}
