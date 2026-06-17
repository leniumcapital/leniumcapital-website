"use client";

import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import {
  usePositionStore,
  type Position,
  type Direction,
  currentPriceFor,
} from "@/stores/positionStore";
import { useAccountStore } from "@/stores/accountStore";
import { useChallengeStore } from "@/stores/challengeStore";
import { useMarketStore } from "@/stores/marketStore";
import { resolveTierForAccount, resolveRules, validateOrder, effectiveAccountSize } from "@/lib/rules";

type PlaceOrderInput = {
  marketTicker: string;
  direction: Direction;
  size: number;
  question: string;
  category: string;
  marketExpiry?: string;
};

type OrderResponse = {
  ok?: boolean;
  error?: string;
  fill?: {
    positionId: string;
    marketTicker: string;
    question: string;
    direction: Direction;
    size: number;
    entryPrice: number;
    openedAt: number;
    commission?: number;
  };
};

function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildOpenSnapshots() {
  const positions = usePositionStore.getState().positions;
  return Object.values(positions).map((p) => ({
    marketTicker: p.marketTicker,
    size: p.size,
    entryPrice: p.entryPrice,
    direction: p.direction,
    currentPrice: currentPriceFor(p),
  }));
}

/** Place a simulated order through the server, then record it client-side. */
export function usePlaceOrder() {
  return useMutation({
    mutationFn: async (input: PlaceOrderInput) => {
      const account = useAccountStore.getState();
      const challenge = useChallengeStore.getState();
      const size = effectiveAccountSize({
        accountSize: account.accountSize,
        tier: account.tier,
        challengeTier: account.challengeTier,
        fundedTier: account.fundedTier,
        tradingMode: account.tradingMode,
      });
      const tier = resolveTierForAccount(size);

      if (!tier) throw new Error("No active account tier.");

      const phase =
        account.accountType === "funded" ? "funded" : "evaluation";
      const realized = usePositionStore
        .getState()
        .closedTrades.reduce((s, t) => s + t.pnl, 0);
      const unrealized = Object.values(usePositionStore.getState().positions).reduce(
        (s, p) => s + (p.entryPrice > 0 ? (p.size * (currentPriceFor(p) - p.entryPrice)) / p.entryPrice : 0),
        0,
      );
      const currentProfit = realized + unrealized;
      const equity = size + currentProfit;

      const rules = resolveRules({
        tier,
        addons: account.addons,
        phase,
        currentBalance: equity,
      });

      const market = useMarketStore.getState().markets[input.marketTicker];
      const entryPrice =
        input.direction === "yes"
          ? (market?.yesPrice ?? 0)
          : (market?.noPrice ?? 0);

      const clientCheck = validateOrder({
        rules,
        startingBalance: size,
        currentProfit,
        highWaterMarkUsd: challenge.highWaterMarkUsd,
        staticFloorUsd: challenge.staticFloorUsd,
        openPositions: buildOpenSnapshots(),
        newOrder: {
          size: input.size,
          direction: input.direction,
          marketTicker: input.marketTicker,
          entryPrice,
          marketExpiry: input.marketExpiry ?? market?.expiry,
        },
        challengeStatus: account.challengeStatus,
        accountType: account.accountType,
        windowEndDate: challenge.windowEndDate,
      });

      if (!clientCheck.ok) throw new Error(clientCheck.error);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketTicker: input.marketTicker,
          direction: input.direction,
          size: input.size,
          marketExpiry: input.marketExpiry ?? market?.expiry,
          openPositions: buildOpenSnapshots(),
          currentProfit,
          highWaterMarkUsd: challenge.highWaterMarkUsd,
          staticFloorUsd: challenge.staticFloorUsd,
          windowEndDate: challenge.windowEndDate,
          addons: account.addons,
          accountType: account.accountType,
          challengeStatus: account.challengeStatus,
        }),
      });
      const data = (await res.json()) as OrderResponse;
      if (!res.ok || !data.fill) {
        throw new Error(data.error ?? "Order failed");
      }
      return { fill: data.fill, input, commission: clientCheck.commission };
    },
    onSuccess: ({ fill, input, commission }) => {
      const market = useMarketStore.getState().markets[input.marketTicker];
      usePositionStore.getState().addPosition({
        id: fill.positionId,
        marketTicker: fill.marketTicker,
        question: fill.question || input.question,
        category: input.category,
        direction: fill.direction,
        size: fill.size,
        entryPrice: fill.entryPrice,
        marketExpiry: input.marketExpiry ?? market?.expiry,
        openedAt: fill.openedAt,
      });
      useChallengeStore.getState().addTradedDate(todayUtcIso());
      useAccountStore.getState().recordTrade();
      if (commission > 0) {
        useAccountStore.getState().addCommission(commission);
      }
      toast.success(
        `Order placed — buying ${fill.direction.toUpperCase()} $${fill.size.toLocaleString()} on ${fill.question}`,
      );
    },
    onError: (err: Error) => {
      toast.error(err.message || "Order failed — please try again.");
    },
  });
}

type CloseResponse = { ok?: boolean; error?: string; exitPrice?: number };

/** Close a position at the live price via the server. */
export function useClosePosition() {
  return useMutation({
    mutationFn: async (position: Position) => {
      const res = await fetch("/api/orders/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionId: position.id,
          marketTicker: position.marketTicker,
          direction: position.direction,
        }),
      });
      const data = (await res.json()) as CloseResponse;
      if (!res.ok || data.exitPrice == null) {
        throw new Error(data.error ?? "Close failed");
      }
      return { position, exitPrice: data.exitPrice };
    },
    onSuccess: ({ position, exitPrice }) => {
      const closed = usePositionStore
        .getState()
        .closePosition(position.id, exitPrice);
      if (closed) {
        const account = useAccountStore.getState();
        account.updateBalance(account.balance + closed.pnl);
        const sign = closed.pnl >= 0 ? "+" : "−";
        toast.success(
          `Position closed — ${sign}$${Math.abs(closed.pnl).toFixed(2)} on ${position.question}`,
        );
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not close position.");
    },
  });
}

/** Open positions as a stable array, sorted newest first. */
export function useOpenPositions(): Position[] {
  return usePositionStore(
    useShallow((s) =>
      Object.values(s.positions).sort((a, b) => b.openedAt - a.openedAt),
    ),
  );
}

/** Open position for one market (or null). */
export function usePositionForMarket(ticker: string | null): Position | null {
  const find = useCallback(
    (s: { positions: Record<string, Position> }) => {
      if (!ticker) return null;
      for (const id of Object.keys(s.positions)) {
        if (s.positions[id].marketTicker === ticker) return s.positions[id];
      }
      return null;
    },
    [ticker],
  );
  return usePositionStore(find);
}
