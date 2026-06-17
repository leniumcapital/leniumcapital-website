import type { DashboardEvent } from "@/lib/marketDetail";
import type { Market } from "@/stores/marketStore";

export const TRENDING_SIDEBAR_WIDTH = 320;
export const TRENDING_COLUMN_GAP = 24;
export const HERO_CAROUSEL_SIZE = 7;
export const SECTION_PREVIEW_SIZE = 4;
export const COMPACT_LIST_SIZE = 3;

/** Friendly series labels for section headers and cards. */
const SERIES_DISPLAY: Record<string, string> = {
  KXNBAGAME: "Pro Basketball (M)",
  KXWNBAGAME: "Pro Basketball (W)",
  KXNFLGAME: "Pro Football",
  KXMLBGAME: "Pro Baseball",
  KXNHLGAME: "Pro Hockey",
  KXWTAMATCH: "Tennis (W)",
  KXATPMATCH: "Tennis (M)",
  KXUCLGAME: "Soccer",
  KXEPLGAME: "Soccer",
  KXWCGAME: "World Soccer Cup",
  KXPRESNOMD: "2026 Primaries",
  KXPRESNOMR: "2026 Primaries",
};

export type SeriesSection = {
  seriesTicker: string;
  displayName: string;
  eventTickers: string[];
  totalVolume: number;
};

export function seriesDisplayName(
  seriesTicker: string,
  sample?: DashboardEvent,
): string {
  if (SERIES_DISPLAY[seriesTicker]) return SERIES_DISPLAY[seriesTicker];
  if (sample?.subCategory) return sample.subCategory;
  return seriesTicker.replace(/^KX/i, "").replace(/GAME$/i, "") || seriesTicker;
}

/** Odds multiplier: 55% → 1.82x */
export function formatMultiplier(yesPrice: number): string {
  if (yesPrice <= 0) return "—";
  return `${(100 / yesPrice).toFixed(2)}x`;
}

export function formatVolShort(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${Math.round(usd)}`;
}

/** Kalshi card footer volume — full commas under $1M. */
export function formatVolKalshi(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(2)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(usd).toLocaleString("en-US")}`;
}

/** Kalshi-style date label: "Jun 16 @ 5:05PM". */
export function formatCloseLabelKalshi(iso: string, now: number): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(" ", "");
  if (now > 0) {
    const today = new Date(now);
    const tomorrow = new Date(now + 86_400_000);
    if (d.toDateString() === today.toDateString()) return `Today @ ${time}`;
    if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow @ ${time}`;
  }
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${date} @ ${time}`;
}

/** Kalshi footer market count — "Spread and Total   2 markets". */
export function formatMarketCountLabel(event: DashboardEvent): string {
  const n = event.marketCount;
  const isGame =
    event.category === "Sports" ||
    /GAME$/i.test(event.seriesTicker) ||
    /MATCH$/i.test(event.seriesTicker);

  if (n === 1) return "Spread and Total   1 market";
  if (isGame && n === 2) return "Spread and Total   2 markets";
  if (isGame && n > 2) return `Spread and Total   ${n} markets`;
  return `${n} market${n === 1 ? "" : "s"}`;
}

export function formatCloseLabel(iso: string, now: number): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(" ", "");
  if (now > 0) {
    const today = new Date(now);
    const tomorrow = new Date(now + 86_400_000);
    if (d.toDateString() === today.toDateString()) return `Today @ ${time}`;
    if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow @ ${time}`;
  }
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${date} @ ${time}`;
}

export function isEventLive(closeTime: string, now: number): boolean {
  if (!closeTime || now <= 0) return false;
  const closeMs = new Date(closeTime).getTime();
  if (Number.isNaN(closeMs)) return false;
  return closeMs - now < 4 * 3_600_000 && now - closeMs < 3 * 3_600_000;
}

export function groupEventsBySeries(
  eventTickers: string[],
  events: Record<string, DashboardEvent>,
): SeriesSection[] {
  const bySeries = new Map<string, string[]>();

  for (const ticker of eventTickers) {
    const ev = events[ticker];
    if (!ev) continue;
    const key = ev.seriesTicker || "OTHER";
    const list = bySeries.get(key) ?? [];
    list.push(ticker);
    bySeries.set(key, list);
  }

  const multi: SeriesSection[] = [];
  const singles: string[] = [];

  for (const [seriesTicker, tickers] of bySeries) {
    const sorted = [...tickers].sort(
      (a, b) => events[b].totalVolume - events[a].totalVolume,
    );
    const totalVolume = sorted.reduce(
      (sum, t) => sum + (events[t]?.totalVolume ?? 0),
      0,
    );
    if (sorted.length >= 2) {
      multi.push({
        seriesTicker,
        displayName: seriesDisplayName(seriesTicker, events[sorted[0]]),
        eventTickers: sorted,
        totalVolume,
      });
    } else {
      singles.push(...sorted);
    }
  }

  multi.sort(
    (a, b) =>
      b.totalVolume - a.totalVolume ||
      (events[b.eventTickers[0]]?.volume24h ?? 0) -
        (events[a.eventTickers[0]]?.volume24h ?? 0),
  );

  if (singles.length > 0) {
    multi.push({
      seriesTicker: "OTHER",
      displayName: "Other Markets",
      eventTickers: singles.sort(
        (a, b) => events[b].totalVolume - events[a].totalVolume,
      ),
      totalVolume: singles.reduce(
        (sum, t) => sum + (events[t]?.totalVolume ?? 0),
        0,
      ),
    });
  }

  return multi;
}

export type CompactListItem = {
  rank: number;
  eventTicker: string;
  leaderTicker: string;
  title: string;
  subtitle: string;
  probability: number;
  change?: number;
  secondaryRight?: string;
};

/** Whether an event belongs to the active sidebar shortcut filter. */
export function matchesSidebarFilter(
  ev: DashboardEvent,
  filter: string,
): boolean {
  if (ev.seriesTicker === filter) return true;
  if (filter === "ELECTIONS_2026") {
    return (
      ev.category === "Elections" ||
      ev.category === "Politics" ||
      isPrimaryMarket(ev)
    );
  }
  if (filter === "KXWCGAME") {
    return ev.subCategory === "World Cup" || ev.seriesTicker.includes("WC");
  }
  return ev.subCategory === filter;
}

export function filterEventsBySidebar(
  tickers: string[],
  events: Record<string, DashboardEvent>,
  filter: string | null,
): string[] {
  if (!filter) return tickers;
  return tickers.filter((t) => {
    const ev = events[t];
    return ev && matchesSidebarFilter(ev, filter);
  });
}

export function buildHeroEventTickers(
  events: Record<string, DashboardEvent>,
  eventOrder: string[],
  filterSeries: string | null,
): string[] {
  const tickers = filterEventsBySidebar(
    eventOrder.filter((t) => events[t]),
    events,
    filterSeries,
  );
  return [...tickers]
    .sort(
      (a, b) =>
        (events[b].volume24h || events[b].totalVolume) -
        (events[a].volume24h || events[a].totalVolume),
    )
    .slice(0, HERO_CAROUSEL_SIZE);
}

export function isPrimaryMarket(ev: DashboardEvent): boolean {
  const text = `${ev.title} ${ev.subCategory ?? ""}`.toLowerCase();
  const cat = ev.category.toLowerCase();
  if (cat !== "politics" && cat !== "elections") return false;
  return /primary|primaries|governor|nominee|senate candidate|house candidate/.test(
    text,
  );
}

export function priceChange24h(market: Market | undefined): number | null {
  if (!market || market.open24h <= 0) return null;
  return market.yesPrice - market.open24h;
}
