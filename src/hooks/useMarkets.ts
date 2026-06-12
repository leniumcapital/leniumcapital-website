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
    const filtered =
      activeCategory === "All Markets"
        ? [...order]
        : order.filter((t) => markets[t]?.category === activeCategory);
    return sortTickers(filtered, markets, sortOrder);
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
