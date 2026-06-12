"use client";

/**
 * Live price feed for the dashboard.
 *
 * The project's existing working Kalshi integration is the server-side REST
 * layer (Kalshi's WS API requires authenticated API keys that are not yet
 * provisioned). This hook builds the live-data contract on top of it without
 * recreating that integration:
 *
 *  - incoming price updates accumulate in a ref keyed by ticker
 *  - a 250ms interval flushes the accumulator to marketStore in ONE
 *    batchUpdatePrices setState call (one React notification per flush)
 *  - failures drive connectionStore through reconnecting/disconnected with
 *    exponential backoff: 1s, 2s, 4s, 8s, 16s, capped at 30s
 *
 * When Kalshi WS credentials exist, swap the poll loop for a native
 * WebSocket onmessage that writes into the same accumulator — nothing
 * downstream changes.
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useMarketStore, type PriceUpdate, type Market } from "@/stores/marketStore";
import { useConnectionStore } from "@/stores/connectionStore";

const FLUSH_INTERVAL_MS = 250;
const POLL_INTERVAL_MS = 5000;
const BACKOFF_STEPS_MS = [1000, 2000, 4000, 8000, 16000, 30000];

type MarketsResponse = { markets?: Market[] };

export function useWebSocket(): void {
  const accumulatorRef = useRef<Record<string, PriceUpdate>>({});
  const seededRef = useRef(false);
  const failedOnceRef = useRef(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    const connection = useConnectionStore.getState();
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    // ── Flush loop: one batched store write per 250ms tick ──────────────────
    const flushTimer = setInterval(() => {
      const updates = accumulatorRef.current;
      if (Object.keys(updates).length === 0) return;
      useMarketStore.getState().batchUpdatePrices(updates);
      accumulatorRef.current = {};
    }, FLUSH_INTERVAL_MS);

    // ── Feed loop with exponential backoff ───────────────────────────────────
    async function tick(): Promise<void> {
      if (stoppedRef.current) return;
      try {
        const res = await fetch("/api/kalshi/markets", { cache: "no-store" });
        if (!res.ok) throw new Error(`feed ${res.status}`);
        const data = (await res.json()) as MarketsResponse;
        const markets = data.markets ?? [];

        if (!seededRef.current && markets.length > 0) {
          // First load seeds full market objects directly.
          useMarketStore.getState().setMarkets(markets);
          seededRef.current = true;
        } else {
          // Subsequent loads stream through the batching accumulator.
          for (const m of markets) {
            accumulatorRef.current[m.ticker] = {
              ticker: m.ticker,
              yesPrice: m.yesPrice,
              noPrice: m.noPrice,
              volume: m.volume,
            };
          }
        }

        const conn = useConnectionStore.getState();
        if (conn.status !== "connected") {
          conn.setConnected();
          conn.resetReconnectAttempts();
          if (failedOnceRef.current) {
            toast.success("Live prices restored");
            failedOnceRef.current = false;
          }
        } else {
          conn.setConnected(); // refresh lastUpdateTimestamp
        }
        schedule(POLL_INTERVAL_MS);
      } catch {
        const conn = useConnectionStore.getState();
        if (!failedOnceRef.current) {
          toast("Reconnecting to live prices...");
          failedOnceRef.current = true;
        }
        conn.setReconnecting();
        conn.incrementReconnectAttempts();
        const attempt = useConnectionStore.getState().reconnectAttempts;
        const backoff =
          BACKOFF_STEPS_MS[Math.min(attempt - 1, BACKOFF_STEPS_MS.length - 1)];
        schedule(backoff);
      }
    }

    function schedule(ms: number): void {
      if (stoppedRef.current) return;
      pollTimer = setTimeout(tick, ms);
    }

    connection.setReconnecting();
    void tick();

    return () => {
      stoppedRef.current = true;
      clearInterval(flushTimer);
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, []);
}
