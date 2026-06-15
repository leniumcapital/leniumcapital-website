import type { DashboardEvent } from "@/lib/marketDetail";
import { seriesIconDirectUrl } from "@/lib/seriesIcon";

export type FeaturedEvent = {
  seriesTicker: string;
  displayName: string;
  marketCount: number;
  totalVolume: number;
  category: string;
  iconUrl: string | null;
  pinned: boolean;
};

/** Minimal market fields required for featured-event grouping. */
export type FeaturedMarketInput = {
  ticker: string;
  volume: number;
  category: string;
  seriesTicker?: string;
  question?: string;
};

const PINNED_KEYWORDS = [
  "FIFA",
  "World Cup",
  "Presidential Election",
  "Federal Reserve",
  "FOMC",
  "Champions League",
  "Olympics",
  "Super Bowl",
  "NBA Finals",
];

export function isPinnedSeries(_seriesTicker: string, displayName: string): boolean {
  return PINNED_KEYWORDS.some((kw) => displayName.includes(kw));
}

/** Title-case a series ticker or raw Kalshi title. */
export function seriesDisplayName(
  seriesTicker: string,
  sampleTitle?: string,
): string {
  if (sampleTitle && sampleTitle.length > 3 && !sampleTitle.startsWith("KX")) {
    const base = sampleTitle
      .replace(/\?.*$/, "")
      .replace(/\s+at\s+.*$/i, "")
      .trim();
    if (base.length > 3) return base;
  }
  return seriesTicker
    .replace(/^KX/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function majorityCategory(events: DashboardEvent[]): string {
  const counts: Record<string, number> = {};
  for (const ev of events) {
    counts[ev.category] = (counts[ev.category] ?? 0) + 1;
  }
  return (
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Trending"
  );
}

function seriesKey(market: FeaturedMarketInput): string {
  return market.seriesTicker || market.ticker.split("-")[0];
}

/**
 * Group fetched markets by series ticker, rank by volume, apply pinned
 * priority, and return up to twelve featured events.
 */
export function computeFeaturedEvents(
  markets: FeaturedMarketInput[],
  events: DashboardEvent[] = [],
): FeaturedEvent[] {
  const eventsBySeries = new Map<string, DashboardEvent[]>();
  for (const ev of events) {
    const key = ev.seriesTicker || ev.eventTicker.split("-")[0];
    if (!key) continue;
    const list = eventsBySeries.get(key) ?? [];
    list.push(ev);
    eventsBySeries.set(key, list);
  }

  const bySeries = new Map<string, FeaturedMarketInput[]>();
  for (const m of markets) {
    const key = seriesKey(m);
    if (!key) continue;
    const list = bySeries.get(key) ?? [];
    list.push(m);
    bySeries.set(key, list);
  }

  const aggregated: FeaturedEvent[] = [];

  for (const [seriesTicker, group] of bySeries) {
    const marketCount = group.length;
    if (marketCount <= 0) continue;

    const totalVolume = group.reduce((s, m) => s + m.volume, 0);
    const relatedEvents = eventsBySeries.get(seriesTicker) ?? [];
    const displayName = seriesDisplayName(
      seriesTicker,
      relatedEvents[0]?.title ?? group[0]?.question,
    );
    const category =
      relatedEvents.length > 0
        ? majorityCategory(relatedEvents)
        : (group[0]?.category ?? "Trending");
    const pinned = isPinnedSeries(seriesTicker, displayName);
    const iconUrl = seriesIconDirectUrl(seriesTicker);

    aggregated.push({
      seriesTicker,
      displayName,
      marketCount,
      totalVolume,
      category,
      iconUrl,
      pinned,
    });
  }

  const pinned = aggregated
    .filter((e) => e.pinned)
    .sort((a, b) => b.totalVolume - a.totalVolume);

  const rest = aggregated
    .filter((e) => !e.pinned)
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, Math.max(0, 12 - pinned.length));

  return [...pinned, ...rest].slice(0, 12);
}

/** Sum of market counts across all dashboard events. */
export function totalTrendingMarketCount(events: DashboardEvent[]): number {
  return events.reduce((sum, ev) => sum + ev.marketCount, 0);
}

export function formatFeaturedVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(0)}M`;
  if (volume >= 1_000) return `$${Math.round(volume / 1_000)}K`;
  return `$${volume}`;
}

/** Resolve featured metadata for a series, including filtered-but-unranked series. */
export function featuredEventForSeries(
  seriesTicker: string,
  featuredEvents: FeaturedEvent[],
  events: DashboardEvent[],
): FeaturedEvent | null {
  const match = featuredEvents.find((e) => e.seriesTicker === seriesTicker);
  if (match) return match;

  const related = events.filter((ev) => ev.seriesTicker === seriesTicker);
  if (related.length === 0) return null;

  const displayName = seriesDisplayName(seriesTicker, related[0]?.title);
  return {
    seriesTicker,
    displayName,
    marketCount: related.reduce((s, ev) => s + ev.marketCount, 0),
    totalVolume: related.reduce((s, ev) => s + ev.totalVolume, 0),
    category: majorityCategory(related),
    iconUrl: seriesIconDirectUrl(seriesTicker),
    pinned: isPinnedSeries(seriesTicker, displayName),
  };
}
