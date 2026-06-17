"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMarketStore } from "@/stores/marketStore";
import { useUiStore } from "@/stores/uiStore";
import { useMarketsQuery } from "@/hooks/useMarkets";
import { useTrendingSeriesSections } from "@/hooks/useTrendingLayout";
import { TrendingHeroCard } from "@/components/dashboard/trending/TrendingHeroCard";
import { TrendingSeriesSection } from "@/components/dashboard/trending/TrendingSeriesSection";
import { TrendingRightSidebar } from "@/components/dashboard/trending/TrendingRightSidebar";
import {
  fetchMarketHistoryClient,
  marketHistoryQueryKey,
} from "@/lib/clientApi";
import { TRENDING_COLUMN_GAP } from "@/lib/trendingLayout";
import { T } from "@/lib/tokens";

/** Kalshi-style two-column Trending layout: hero + series sections | sidebar. */
export function TrendingPageLayout() {
  const { data, isError, refetch } = useMarketsQuery();
  const sections = useTrendingSeriesSections();
  const eventSearch = useUiStore((s) => s.eventSearch);
  const queryClient = useQueryClient();
  const hasEvents = useMarketStore((s) => s.eventOrder.length > 0);

  useEffect(() => {
    if (!data) return;
    if (data.markets.length > 0 || data.events.length > 0) {
      useMarketStore.getState().syncCatalogFromKalshi({
        markets: data.markets,
        events: data.events,
      });
    }
  }, [data]);

  // Seed 24h open for movers + prefetch hero histories
  useEffect(() => {
    if (!data?.markets.length) return;
    const top = [...data.markets]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 20);
    for (const m of top) {
      void queryClient.prefetchQuery({
        queryKey: marketHistoryQueryKey(m.ticker, "1D"),
        queryFn: () => fetchMarketHistoryClient(m.ticker, "1D"),
        staleTime: 300_000,
      });
    }
    void Promise.all(
      top.map(async (m) => {
        try {
          const res = await fetchMarketHistoryClient(m.ticker, "1D");
          if (res.length >= 2) {
            useMarketStore.getState().seedSparklineFromHistory(m.ticker, res);
          }
        } catch {
          /* best effort */
        }
      }),
    );
  }, [data, queryClient]);

  if (eventSearch.trim()) {
    return (
      <div style={{ padding: "16px 24px 48px", fontFamily: T.font, color: T.textMuted }}>
        Clear event search to view the Trending layout.
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: "120px 24px", textAlign: "center", fontFamily: T.font }}>
        <p style={{ color: T.textPrimary }}>Unable to load markets</p>
        <button
          type="button"
          onClick={() => void refetch()}
          style={{
            marginTop: 12,
            border: T.hairline(),
            background: "transparent",
            color: T.textSecondary,
            borderRadius: 6,
            padding: "8px 16px",
            cursor: "pointer",
            fontFamily: T.font,
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!hasEvents && !data) {
    return <TrendingSkeleton />;
  }

  return (
    <div
      className="trending-page-layout"
      style={{
        display: "flex",
        gap: TRENDING_COLUMN_GAP,
        padding: "16px 24px 48px",
        alignItems: "flex-start",
        fontFamily: T.font,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <TrendingHeroCard />
        {sections.map((section) => (
          <TrendingSeriesSection key={section.seriesTicker} section={section} />
        ))}
      </div>
      <TrendingRightSidebar />
    </div>
  );
}

function TrendingSkeleton() {
  return (
    <div
      className="trending-page-layout"
      style={{
        display: "flex",
        gap: TRENDING_COLUMN_GAP,
        padding: "16px 24px 48px",
        fontFamily: T.font,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="lenium-skeleton" style={{ height: 320, borderRadius: 12, marginBottom: 24 }} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="lenium-skeleton" style={{ height: 140, borderRadius: 10 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
