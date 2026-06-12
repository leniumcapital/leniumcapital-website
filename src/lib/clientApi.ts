"use client";

/**
 * Typed client-side fetchers for the Kalshi API routes. Shared between the
 * detail page queries and the grid's prefetching so query keys + functions
 * always match and prefetched data is reused.
 */

import type { MarketDetail, ChartRange } from "@/lib/marketDetail";
import type { PricePoint } from "@/stores/marketStore";

export async function fetchMarketDetailClient(
  ticker: string,
): Promise<MarketDetail> {
  const res = await fetch(`/api/kalshi/markets/${encodeURIComponent(ticker)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load market");
  const data = (await res.json()) as { market?: MarketDetail };
  if (!data.market) throw new Error("Market not found");
  return data.market;
}

export async function fetchMarketHistoryClient(
  ticker: string,
  range: ChartRange,
): Promise<PricePoint[]> {
  const res = await fetch(
    `/api/kalshi/markets/${encodeURIComponent(ticker)}/history?range=${range}`,
    { cache: "no-store" },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { points?: PricePoint[] };
  return data.points ?? [];
}

export const marketDetailQueryKey = (ticker: string) =>
  ["market-detail", ticker] as const;

export const marketHistoryQueryKey = (ticker: string, range: ChartRange) =>
  ["market-history", ticker, range] as const;
