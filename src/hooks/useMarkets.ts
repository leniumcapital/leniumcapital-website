"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { useMarketStore, type Market } from "@/stores/marketStore";
import { useUiStore, type SortOrder } from "@/stores/uiStore";

/** Initial market fetch via React Query (the live feed keeps prices fresh). */
export function useMarketsQuery() {
  return useQuery({
    queryKey: ["kalshi-markets"],
    queryFn: async (): Promise<Market[]> => {
      const res = await fetch("/api/kalshi/markets", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load markets");
      const data = (await res.json()) as { markets?: Market[] };
      return data.markets ?? [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

function sortTickers(
  tickers: string[],
  markets: Record<string, Market>,
  order: SortOrder,
): string[] {
  const arr = [...tickers];
  switch (order) {
    case "volume":
      return arr.sort((a, b) => markets[b].volume - markets[a].volume);
    case "expiry":
      return arr.sort(
        (a, b) =>
          new Date(markets[a].expiry || 8.64e15).getTime() -
          new Date(markets[b].expiry || 8.64e15).getTime(),
      );
    case "movement":
      return arr.sort((a, b) => {
        const moveA = Math.abs(markets[a].yesPrice - markets[a].open24h);
        const moveB = Math.abs(markets[b].yesPrice - markets[b].open24h);
        return moveB - moveA;
      });
    case "newest":
      return arr.reverse();
  }
}

/** Fixed display order of category sections, mirroring Kalshi. */
export const CATEGORY_ORDER = [
  "Economics",
  "Politics",
  "Sports",
  "Crypto",
  "Culture",
  "Climate",
  "Science and Tech",
  "Health",
] as const;

const TRENDING_TAB_SIZE = 20;
const TRENDING_SECTION_SIZE = 6;

function topByVolume24h(
  tickers: string[],
  markets: Record<string, Market>,
  count: number,
): string[] {
  return [...tickers]
    .sort(
      (a, b) =>
        (markets[b].volume24h || markets[b].volume) -
        (markets[a].volume24h || markets[a].volume),
    )
    .slice(0, count);
}

/**
 * Visible market tickers for the grid: category-filtered, sorted. Subscribes
 * only to the ticker/category/order slices — price changes don't re-sort.
 */
export function useVisibleMarketTickers(): string[] {
  const activeCategory = useUiStore((s) => s.activeCategory);
  const sortOrder = useUiStore((s) => s.sortOrder);

  // Category + order are stable across price-only updates; prices intentionally
  // do not invalidate this selector (cards subscribe to their own prices).
  const tickerCategoryKey = useMarketStore(
    useShallow((s) => s.order.map((t) => `${t}:${s.markets[t]?.category}`)),
  );

  return useMemo(() => {
    const { markets, order } = useMarketStore.getState();
    if (activeCategory === "Trending") {
      return topByVolume24h(order, markets, TRENDING_TAB_SIZE);
    }
    const filtered =
      activeCategory === "All Markets"
        ? [...order]
        : order.filter((t) => markets[t]?.category === activeCategory);
    return sortTickers(filtered, markets, sortOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, sortOrder, tickerCategoryKey]);
}

export type MarketSection = {
  category: string;
  tickers: string[];
};

export type GroupedMarkets = {
  /** Highest 24h-volume market — the featured card. Null while loading. */
  featured: string | null;
  sections: MarketSection[];
};

/**
 * Markets grouped into Kalshi-style category sections. "All Markets" and
 * "Trending" show a Trending section first, then every category in order;
 * a specific category shows only its own section.
 */
export function useGroupedMarkets(): GroupedMarkets {
  const activeCategory = useUiStore((s) => s.activeCategory);
  const sortOrder = useUiStore((s) => s.sortOrder);

  const tickerCategoryKey = useMarketStore(
    useShallow((s) => s.order.map((t) => `${t}:${s.markets[t]?.category}`)),
  );

  return useMemo(() => {
    const { markets, order } = useMarketStore.getState();
    if (order.length === 0) return { featured: null, sections: [] };

    const featured = topByVolume24h(order, markets, 1)[0] ?? null;
    const showAll =
      activeCategory === "All Markets" || activeCategory === "Trending";

    const sections: MarketSection[] = [];

    if (showAll) {
      const trendingSize =
        activeCategory === "Trending" ? TRENDING_TAB_SIZE : TRENDING_SECTION_SIZE;
      sections.push({
        category: "Trending",
        tickers: topByVolume24h(order, markets, trendingSize),
      });
      for (const category of CATEGORY_ORDER) {
        const tickers = order.filter((t) => markets[t]?.category === category);
        if (tickers.length === 0) continue;
        sections.push({
          category,
          tickers: sortTickers(tickers, markets, sortOrder),
        });
      }
    } else {
      const tickers = order.filter(
        (t) => markets[t]?.category === activeCategory,
      );
      sections.push({
        category: activeCategory,
        tickers: sortTickers(tickers, markets, sortOrder),
      });
    }

    return { featured, sections };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, sortOrder, tickerCategoryKey]);
}

/** Live category → count map for the sidebar badges. */
export function useCategoryCounts(): Record<string, number> {
  return useMarketStore(
    useShallow((s) => {
      const counts: Record<string, number> = {};
      for (const ticker of s.order) {
        const cat = s.markets[ticker]?.category;
        if (!cat) continue;
        counts[cat] = (counts[cat] ?? 0) + 1;
      }
      return counts;
    }),
  );
}
