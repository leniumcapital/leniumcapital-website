"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { activeAccountId, useAccountStore } from "@/stores/accountStore";
import { usePositionStore, type ClosedTrade, type Position } from "@/stores/positionStore";
import { reconcileCashBalance } from "@/lib/accountBalance";
import type { AddonId } from "@/lib/pricing";

type OrdersPayload = {
  balance: number;
  purchasedAddons: AddonId[];
  open: Array<{
    id: string;
    marketTicker: string;
    question: string | null;
    category: string | null;
    direction: "yes" | "no";
    size: number;
    entryPrice: number;
    openedAt: number;
  }>;
  closed: Array<{
    id: string;
    marketTicker: string;
    question: string | null;
    category: string | null;
    direction: "yes" | "no";
    size: number;
    entryPrice: number;
    openedAt: number;
    exitPrice: number;
    pnl: number;
    pnlPercent: number;
    closedAt: number;
  }>;
};

/** Hydrate positions, closed trades, balance, and add-ons from the server. */
export function useTradingDataSync(accountStatusLoaded: boolean): boolean {
  const [loaded, setLoaded] = useState(false);
  const { update } = useSession();
  const accountId = useAccountStore((s) => activeAccountId(s));

  useEffect(() => {
    if (!accountStatusLoaded) return;

    let cancelled = false;

    async function load() {
      const account = useAccountStore.getState();
      const accountId = activeAccountId(account);
      if (!accountId) {
        usePositionStore.getState().hydrateFromServer([], []);
        if (!cancelled) setLoaded(true);
        return;
      }

      try {
        const res = await fetch(
          `/api/orders?accountId=${encodeURIComponent(accountId)}`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as OrdersPayload;
        if (cancelled) return;

        const open: Position[] = data.open.map((row) => ({
          id: row.id,
          marketTicker: row.marketTicker,
          question: row.question ?? row.marketTicker,
          category: row.category ?? "Markets",
          direction: row.direction,
          size: row.size,
          entryPrice: row.entryPrice,
          openedAt: row.openedAt,
        }));

        const closed: ClosedTrade[] = data.closed.map((row) => ({
          id: row.id,
          marketTicker: row.marketTicker,
          question: row.question ?? row.marketTicker,
          category: row.category ?? "Markets",
          direction: row.direction,
          size: row.size,
          entryPrice: row.entryPrice,
          openedAt: row.openedAt,
          exitPrice: row.exitPrice,
          pnl: row.pnl,
          pnlPercent: row.pnlPercent,
          closedAt: row.closedAt,
        }));

        usePositionStore.getState().hydrateFromServer(open, closed);
        useAccountStore.getState().setAddons(data.purchasedAddons);
        useAccountStore.getState().updateBalance(data.balance);
        reconcileCashBalance();

        void update({
          user: {
            balance: data.balance,
          },
        });
      } catch {
        reconcileCashBalance();
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [accountStatusLoaded, accountId, update]);

  return loaded;
}
