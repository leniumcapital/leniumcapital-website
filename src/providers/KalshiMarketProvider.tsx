"use client";

/**
 * Global Kalshi market data provider.
 *
 * Mounted ONCE at the root layout, outside every other provider, so the live
 * feed survives all page navigations for the entire session. Exactly one
 * connection exists app-wide; nothing here ever re-renders the tree (the
 * connection, accumulator, and timers all live in refs).
 *
 * Transport: on start the provider asks /api/kalshi/ws-token whether native
 * WebSocket credentials are configured. Kalshi's WS endpoint
 * (wss://api.elections.kalshi.com/trade-api/ws/v2) requires signed headers on
 * the HTTP upgrade, which a browser cannot send — so when credentials are
 * absent (or a token route is not available) the provider drives the exact
 * same pipeline from the server-side REST feed:
 *
 *   incoming updates -> 250ms accumulator ref -> ONE batchUpdatePrices flush
 *
 * Reconnection uses exponential backoff (1s doubling to 30s max) and drives
 * connectionStore through reconnecting/connected, resubscribing to all
 * markets in the store after every recovery.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useMarketStore,
  type PriceUpdate,
  type Market,
} from "@/stores/marketStore";
import { useConnectionStore } from "@/stores/connectionStore";

const FLUSH_INTERVAL_MS = 250;
const POLL_INTERVAL_MS = 5000;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30000;

type MarketsResponse = { markets?: Market[] };
type WsTokenResponse = { wsEnabled?: boolean; token?: string };

/** Single QueryClient for the whole app — grid prefetches feed detail pages. */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 2 },
  },
});

export function KalshiMarketProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <KalshiFeed />
      {children}
    </QueryClientProvider>
  );
}

/** Headless component owning the singleton feed. Renders nothing. */
function KalshiFeed(): null {
  const pathname = usePathname();
  const startedRef = useRef(false);
  const stoppedRef = useRef(false);
  const accumulatorRef = useRef<Record<string, PriceUpdate>>({});
  const seededRef = useRef(false);
  const failedOnceRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // The feed needs an authenticated session; it starts the first time the
  // user reaches the dashboard and then stays alive for the whole session,
  // including while they browse marketing pages.
  const onDashboard = pathname?.startsWith("/dashboard") ?? false;

  useEffect(() => {
    if (!onDashboard || startedRef.current) return;
    startedRef.current = true;
    stoppedRef.current = false;

    // ── Flush loop: one batched store write per 250ms tick ───────────────────
    flushTimerRef.current = setInterval(() => {
      const updates = accumulatorRef.current;
      if (Object.keys(updates).length === 0) return;
      useMarketStore.getState().batchUpdatePrices(updates);
      accumulatorRef.current = {};
    }, FLUSH_INTERVAL_MS);

    function backoffMs(attempt: number): number {
      return Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1));
    }

    function schedule(ms: number): void {
      if (stoppedRef.current) return;
      pollTimerRef.current = setTimeout(() => void tick(), ms);
    }

    function onFeedRecovered(): void {
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
    }

    function onFeedFailure(): void {
      const conn = useConnectionStore.getState();
      if (!failedOnceRef.current) {
        toast("Reconnecting to live prices...");
        failedOnceRef.current = true;
      }
      conn.setReconnecting();
      conn.incrementReconnectAttempts();
      schedule(backoffMs(useConnectionStore.getState().reconnectAttempts));
    }

    // ── REST transport: same accumulator contract as the native socket ──────
    async function tick(): Promise<void> {
      if (stoppedRef.current) return;
      try {
        const res = await fetch("/api/kalshi/markets", { cache: "no-store" });
        if (!res.ok) throw new Error(`feed ${res.status}`);
        const data = (await res.json()) as MarketsResponse;
        const markets = data.markets ?? [];
        if (markets.length === 0) throw new Error("empty feed");

        if (!seededRef.current) {
          useMarketStore.getState().initializeMarkets(markets);
          seededRef.current = true;
        } else {
          for (const m of markets) {
            accumulatorRef.current[m.ticker] = {
              ticker: m.ticker,
              yesPrice: m.yesPrice,
              noPrice: m.noPrice,
              volume: m.volume,
            };
          }
        }
        onFeedRecovered();
        schedule(POLL_INTERVAL_MS);
      } catch {
        onFeedFailure();
      }
    }

    // ── Native WS transport, used when server-side credentials exist ────────
    function openNativeSocket(token: string): void {
      const ws = new WebSocket(
        `wss://api.elections.kalshi.com/trade-api/ws/v2?token=${encodeURIComponent(token)}`,
      );
      wsRef.current = ws;

      ws.onopen = () => {
        onFeedRecovered();
        const tickers = useMarketStore.getState().order;
        ws.send(
          JSON.stringify({
            id: 1,
            cmd: "subscribe",
            params: { channels: ["ticker"], market_tickers: tickers },
          }),
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as {
            type?: string;
            msg?: { market_ticker?: string; price?: number; yes_bid?: number };
          };
          if (msg.type !== "ticker" || !msg.msg?.market_ticker) return;
          const yes = Math.min(
            99,
            Math.max(1, msg.msg.price ?? msg.msg.yes_bid ?? 0),
          );
          if (yes <= 0) return;
          accumulatorRef.current[msg.msg.market_ticker] = {
            ticker: msg.msg.market_ticker,
            yesPrice: yes,
            noPrice: 100 - yes,
          };
        } catch {
          /* malformed frame — ignore */
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (stoppedRef.current) return;
        onFeedFailure(); // backoff then retry via tick(), which re-checks token
      };
      ws.onerror = () => ws.close();
    }

    // ── Start: pick the transport, then run forever ──────────────────────────
    async function start(): Promise<void> {
      useConnectionStore.getState().setReconnecting();
      try {
        const res = await fetch("/api/kalshi/ws-token", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as WsTokenResponse;
          if (data.wsEnabled && data.token) {
            openNativeSocket(data.token);
            return;
          }
        }
      } catch {
        /* fall through to REST transport */
      }
      void tick();
    }

    void start();

    return () => {
      // Root provider never unmounts in practice; this guards dev/StrictMode.
      stoppedRef.current = true;
      startedRef.current = false;
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      wsRef.current?.close();
    };
  }, [onDashboard]);

  return null;
}
