import type { DashboardEvent } from "@/lib/marketDetail";

export type FeaturedEvent = {
  seriesTicker: string;
  displayName: string;
  marketCount: number;
  totalVolume: number;
  category: string;
  iconUrl: string | null;
  pinned: boolean;
};

const PINNED_PATTERNS: RegExp[] = [
  /fifa|world.?cup/i,
  /presidential|president|election/i,
  /senate/i,
  /fed|fomc|federal.?reserve|interest.?rate/i,
  /olympic/i,
  /champions.?league|ucl/i,
  /world.?cup.?final/i,
];

export function isPinnedSeries(seriesTicker: string, displayName: string): boolean {
  const hay = `${seriesTicker} ${displayName}`;
  return PINNED_PATTERNS.some((re) => re.test(hay));
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

/**
 * Group dashboard events by series ticker, rank by volume, apply pinned
 * priority, and return up to twelve featured events.
 */
export function computeFeaturedEvents(
  events: DashboardEvent[],
): FeaturedEvent[] {
  const bySeries = new Map<string, DashboardEvent[]>();

  for (const ev of events) {
    const key = ev.seriesTicker || ev.eventTicker.split("-")[0];
    if (!key) continue;
    const list = bySeries.get(key) ?? [];
    list.push(ev);
    bySeries.set(key, list);
  }

  const aggregated: FeaturedEvent[] = [];

  for (const [seriesTicker, group] of bySeries) {
    const marketCount = group.reduce((s, e) => s + e.marketCount, 0);
    if (marketCount <= 0) continue;

    const totalVolume = group.reduce((s, e) => s + e.totalVolume, 0);
    const displayName = seriesDisplayName(seriesTicker, group[0]?.title);
    const category = majorityCategory(group);
    const pinned = isPinnedSeries(seriesTicker, displayName);

    aggregated.push({
      seriesTicker,
      displayName,
      marketCount,
      totalVolume,
      category,
      iconUrl: null,
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

export function formatFeaturedVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(0)}M`;
  if (volume >= 1_000) return `$${Math.round(volume / 1_000)}K`;
  return `$${volume}`;
}
