"use client";

import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import {
  usePositionStore,
  type Position,
  type Direction,
} from "@/stores/positionStore";
import { useAccountStore } from "@/stores/accountStore";
import { useChallengeStore } from "@/stores/challengeStore";

type PlaceOrderInput = {
  marketTicker: string;
  direction: Direction;
  size: number;
  question: string;
  category: string;
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
  };
};

function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Place a simulated order through the server, then record it client-side. */
export function usePlaceOrder() {
  return useMutation({
    mutationFn: async (input: PlaceOrderInput) => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketTicker: input.marketTicker,
          direction: input.direction,
          size: input.size,
        }),
      });
      const data = (await res.json()) as OrderResponse;
      if (!res.ok || !data.fill) {
        throw new Error(data.error ?? "Order failed");
      }
      return { fill: data.fill, input };
    },
    onSuccess: ({ fill, input }) => {
      usePositionStore.getState().addPosition({
        id: fill.positionId,
        marketTicker: fill.marketTicker,
        question: fill.question || input.question,
        category: input.category,
        direction: fill.direction,
        size: fill.size,
        entryPrice: fill.entryPrice,
        openedAt: fill.openedAt,
      });
      useChallengeStore.getState().addTradedDate(todayUtcIso());
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
