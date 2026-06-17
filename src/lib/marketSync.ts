import type { DashboardEvent } from "@/lib/marketDetail";

/** How often the dashboard mirrors Kalshi's open catalog (events + markets). */
export const KALSHI_CATALOG_SYNC_MS = 12_000;

/** Server-side cache — slightly shorter than client sync so each poll gets fresh data. */
export const KALSHI_SERVER_CACHE_MS = 8_000;

/** Grace after close/game time before hiding cards (overtime, settlement lag). */
export const FINISHED_EVENT_GRACE_MS = 6 * 3_600_000;

/** How often the client re-checks close times and drops finished cards locally. */
export const FINISHED_EVENT_PRUNE_MS = 60_000;

/** Sports series where close_time is settlement — use game/expected time instead. */
export function isSportsGameSeries(seriesTicker: string): boolean {
  return /GAME$|MATCH$|FIGHT$|RACE$/i.test(seriesTicker);
}

/** True while an event should stay visible on the dashboard. */
export function isEventStillActive(
  ev: DashboardEvent,
  now = Date.now(),
): boolean {
  const { closeTime } = ev;
  if (!closeTime) return true;

  const endMs = new Date(closeTime).getTime();
  if (Number.isNaN(endMs)) return true;

  return now <= endMs + FINISHED_EVENT_GRACE_MS;
}

export function filterActiveEvents(
  events: DashboardEvent[],
  now = Date.now(),
): DashboardEvent[] {
  return events.filter((ev) => isEventStillActive(ev, now));
}

/** Market tickers referenced by event cards (leader + carded outcomes). */
export function marketTickersForEvents(events: DashboardEvent[]): Set<string> {
  const tickers = new Set<string>();
  for (const ev of events) {
    tickers.add(ev.leaderTicker);
    for (const o of ev.outcomes) tickers.add(o.ticker);
  }
  return tickers;
}

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
