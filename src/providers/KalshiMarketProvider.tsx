"use client";

/**
 * Global Kalshi market data provider.
 *
 * Mirrors Kalshi's open catalog every ~12s: new polls appear in the right
 * category, resolved events drop off, trending re-ranks by 24h volume.
 * Optional WebSocket supplements price ticks between catalog syncs.
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
import type { DashboardEvent } from "@/lib/marketDetail";
import { useConnectionStore } from "@/stores/connectionStore";
import { KALSHI_CATALOG_SYNC_MS } from "@/lib/marketSync";

const FLUSH_INTERVAL_MS = 250;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30000;

type MarketsResponse = { markets?: Market[]; events?: DashboardEvent[] };
type WsTokenResponse = { wsEnabled?: boolean; token?: string };

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

function KalshiFeed(): null {
  const pathname = usePathname();
  const startedRef = useRef(false);
  const stoppedRef = useRef(false);
  const accumulatorRef = useRef<Record<string, PriceUpdate>>({});
  const failedOnceRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catalogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const onDashboard = pathname?.startsWith("/dashboard") ?? false;

  useEffect(() => {
    if (!onDashboard || startedRef.current) return;
    startedRef.current = true;
    stoppedRef.current = false;

    flushTimerRef.current = setInterval(() => {
      const updates = accumulatorRef.current;
      if (Object.keys(updates).length === 0) return;
      useMarketStore.getState().batchUpdatePrices(updates);
      accumulatorRef.current = {};
    }, FLUSH_INTERVAL_MS);

    function backoffMs(attempt: number): number {
      return Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1));
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
        conn.setConnected();
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
      scheduleWsReconnect();
    }

    function resubscribeWs(): void {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const tickers = useMarketStore.getState().order;
      ws.send(
        JSON.stringify({
          id: Date.now(),
          cmd: "subscribe",
          params: { channels: ["ticker"], market_tickers: tickers },
        }),
      );
    }

    async function syncCatalog(): Promise<void> {
      if (stoppedRef.current) return;
      try {
        const res = await fetch("/api/kalshi/markets", { cache: "no-store" });
        if (!res.ok) throw new Error(`feed ${res.status}`);
        const data = (await res.json()) as MarketsResponse;
        const markets = data.markets ?? [];
        const events = data.events ?? [];
        if (markets.length === 0 || events.length === 0) {
          throw new Error("empty feed");
        }

        useMarketStore.getState().syncCatalogFromKalshi({ events, markets });
        onFeedRecovered();
        resubscribeWs();
      } catch {
        onFeedFailure();
      }
    }

    function scheduleWsReconnect(): void {
      if (stoppedRef.current || wsRef.current) return;
      retryTimerRef.current = setTimeout(() => {
        void (async () => {
          try {
            const res = await fetch("/api/kalshi/ws-token", { cache: "no-store" });
            if (!res.ok) return;
            const data = (await res.json()) as WsTokenResponse;
            if (data.wsEnabled && data.token) {
              openNativeSocket(data.token);
            }
          } catch {
            /* catalog sync continues on REST */
          }
        })();
      }, backoffMs(useConnectionStore.getState().reconnectAttempts));
    }

    function openNativeSocket(token: string): void {
      const ws = new WebSocket(
        `wss://api.elections.kalshi.com/trade-api/ws/v2?token=${encodeURIComponent(token)}`,
      );
      wsRef.current = ws;

      ws.onopen = () => {
        onFeedRecovered();
        resubscribeWs();
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
          /* malformed frame */
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (stoppedRef.current) return;
        onFeedFailure();
      };
      ws.onerror = () => ws.close();
    }

    async function start(): Promise<void> {
      useConnectionStore.getState().setReconnecting();
      void syncCatalog();
      catalogTimerRef.current = setInterval(
        () => void syncCatalog(),
        KALSHI_CATALOG_SYNC_MS,
      );

      try {
        const res = await fetch("/api/kalshi/ws-token", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as WsTokenResponse;
          if (data.wsEnabled && data.token) {
            openNativeSocket(data.token);
          }
        }
      } catch {
        /* REST catalog sync is sufficient */
      }
    }

    void start();

    return () => {
      stoppedRef.current = true;
      startedRef.current = false;
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      if (catalogTimerRef.current) clearInterval(catalogTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      wsRef.current?.close();
    };
  }, [onDashboard]);

  return null;
}
