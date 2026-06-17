import type { DashboardEvent } from "@/lib/marketDetail";

/** How often the dashboard mirrors Kalshi's open catalog (events + markets). */
export const KALSHI_CATALOG_SYNC_MS = 8_000;

/** Server-side cache — slightly shorter than client sync so each poll gets fresh data. */
export const KALSHI_SERVER_CACHE_MS = 5_000;

/** Grace after close time before hiding non-sports cards (settlement lag). */
export const FINISHED_EVENT_GRACE_MS = 2 * 3_600_000;

/** Shorter grace for games — swap cards soon after the final whistle. */
export const SPORTS_FINISHED_GRACE_MS = 90 * 60_000;

/** How often the client re-checks close times and drops finished cards locally. */
export const FINISHED_EVENT_PRUNE_MS = 15_000;

/** Sports series where close_time is settlement — use game/expected time instead. */
export function isSportsGameSeries(seriesTicker: string): boolean {
  return /GAME$|MATCH$|FIGHT$|RACE$/i.test(seriesTicker);
}

export function finishedEventGraceMs(ev: DashboardEvent): number {
  if (isSportsGameSeries(ev.seriesTicker)) return SPORTS_FINISHED_GRACE_MS;
  return FINISHED_EVENT_GRACE_MS;
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

  return now <= endMs + finishedEventGraceMs(ev);
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
