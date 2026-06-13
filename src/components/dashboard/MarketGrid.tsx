"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMarketStore } from "@/stores/marketStore";
import {
  fetchMarketHistoryClient,
  marketHistoryQueryKey,
} from "@/lib/clientApi";
import {
  useFilteredEventTickers,
  useMarketsQuery,
} from "@/hooks/useMarkets";
import { EventCard, SkeletonEventCard } from "@/components/dashboard/EventCard";
import { IconAlertCircle } from "@tabler/icons-react";
import { T } from "@/lib/tokens";

/**
 * Kalshi-style flat market grid — max four columns, consistent 16px gaps,
 * filtered by the category sidebar. No stacked section headers.
 */
export function MarketGrid() {
  const { data, isError, refetch } = useMarketsQuery();
  const { tickers } = useFilteredEventTickers();

  useEffect(() => {
    if (!data) return;
    if (data.markets.length > 0) {
      useMarketStore.getState().setMarkets(data.markets);
    }
    if (data.events.length > 0) {
      useMarketStore.getState().setEvents(data.events);
    }
  }, [data]);

  const queryClient = useQueryClient();
  useEffect(() => {
    if (!data || data.events.length === 0) return;
    const top = [...data.events]
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 8);
    for (const ev of top) {
      void queryClient.prefetchQuery({
        queryKey: marketHistoryQueryKey(ev.leaderTicker, "1D"),
        queryFn: () => fetchMarketHistoryClient(ev.leaderTicker, "1D"),
        staleTime: 60_000,
      });
    }
  }, [data, queryClient]);

  if (tickers.length === 0) {
    return isError ? <ErrorState onRetry={() => void refetch()} /> : <SkeletonGrid />;
  }

  return (
    <div className="markets-grid">
      {tickers.map((ticker) => (
        <EventCard key={ticker} eventTicker={ticker} />
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="markets-grid">
      {Array.from({ length: 8 }, (_, i) => (
        <SkeletonEventCard key={i} />
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "80px 24px",
        fontFamily: T.font,
        textAlign: "center",
      }}
    >
      <IconAlertCircle size={32} color={T.textMuted} stroke={1.5} />
      <span style={{ color: T.textPrimary, fontSize: 15 }}>Unable to load markets</span>
      <span style={{ color: T.textMuted, fontSize: 13 }}>
        Check your connection and try again.
      </span>
      <button
        type="button"
        onClick={onRetry}
        style={{
          marginTop: 6,
          border: T.hairline(),
          color: T.textSecondary,
          background: "transparent",
          borderRadius: T.radius,
          padding: "8px 16px",
          fontSize: 13,
          cursor: "pointer",
          fontFamily: T.font,
        }}
      >
        Try again
      </button>
    </div>
  );
}
