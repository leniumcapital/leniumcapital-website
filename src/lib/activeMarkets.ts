import type { DashboardEvent } from "@/lib/marketDetail";
import { isEventStillActive } from "@/lib/marketSync";

/** True when a flat market ticker belongs to an active event card in the store. */
export function isMarketTickerActive(
  ticker: string,
  events: Record<string, DashboardEvent>,
  eventOrder: string[],
): boolean {
  for (const eventTicker of eventOrder) {
    const ev = events[eventTicker];
    if (!ev || !isEventStillActive(ev)) continue;
    if (ev.leaderTicker === ticker) return true;
    if (ev.outcomes.some((o) => o.ticker === ticker)) return true;
  }
  return false;
}
