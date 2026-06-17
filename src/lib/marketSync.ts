import type { DashboardEvent } from "@/lib/marketDetail";

/** How often the dashboard mirrors Kalshi's open catalog (events + markets). */
export const KALSHI_CATALOG_SYNC_MS = 12_000;

/** Server-side cache — slightly shorter than client sync so each poll gets fresh data. */
export const KALSHI_SERVER_CACHE_MS = 8_000;

/** Kalshi trending proxy: rank by 24h volume, then total volume. */
export function compareTrendingEvents(a: DashboardEvent, b: DashboardEvent): number {
  const vol24 = b.volume24h - a.volume24h;
  if (vol24 !== 0) return vol24;
  return b.totalVolume - a.totalVolume;
}

export function sortEventTickersByTrending(
  tickers: string[],
  events: Record<string, DashboardEvent>,
): string[] {
  return [...tickers].sort((a, b) => {
    const ea = events[a];
    const eb = events[b];
    if (!ea || !eb) return 0;
    return compareTrendingEvents(ea, eb);
  });
}
