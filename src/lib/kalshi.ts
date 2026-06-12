/**
 * Server-side Kalshi API layer. This module must only ever be imported from
 * API routes or server components — it reads credentials from env vars and
 * talks to Kalshi directly. Client code goes through /api/kalshi/* instead.
 */
import "server-only";

import type {
  MarketDetail,
  MarketOutcome,
  DashboardEvent,
  EventOutcome,
} from "@/lib/marketDetail";

const KALSHI_BASE =
  process.env.KALSHI_API_BASE ??
  "https://api.elections.kalshi.com/trade-api/v2";

// Authenticated endpoints (orders on real funded accounts) will use these.
// They are intentionally never exported — only this module touches them.
const KALSHI_API_KEY = process.env.KALSHI_API_KEY;

// Some upstreams 403 bare datacenter requests with no UA.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export type DashboardMarket = {
  ticker: string;
  question: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  /** Volume traded in the last 24 hours — drives Trending. */
  volume24h: number;
  expiry: string;
  sparklineData: number[];
  open24h: number;
};

type KalshiMarketRaw = {
  ticker?: string;
  title?: string;
  yes_sub_title?: string;
  close_time?: string;
  status?: string;
  event_ticker?: string;
  rules_primary?: string;
  rules_secondary?: string;
  last_price_dollars?: string;
  previous_price_dollars?: string;
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
  volume_fp?: string;
  volume_24h_fp?: string;
  last_price?: number;
  yes_bid?: number;
  yes_ask?: number;
  volume?: number;
  is_provisional?: boolean;
  mve_collection_ticker?: string;
};

type KalshiEventRaw = {
  event_ticker?: string;
  series_ticker?: string;
  title?: string;
  category?: string;
  mutually_exclusive?: boolean;
  markets?: KalshiMarketRaw[];
};

type CandlestickRaw = {
  end_period_ts?: number;
  price?: { close?: number; close_dollars?: string; previous_dollars?: string };
  yes_bid?: { close?: number; close_dollars?: string };
};

async function fetchJson<T>(
  url: string,
  ms: number,
  init?: RequestInit & { next?: { revalidate?: number } },
  retried = false,
): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": UA,
        ...(KALSHI_API_KEY ? { Authorization: `Bearer ${KALSHI_API_KEY}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    if (res.status === 429 && !retried) {
      clearTimeout(timer);
      await new Promise((r) => setTimeout(r, 700));
      return fetchJson<T>(url, ms, init, true);
    }
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function priceCents(m: KalshiMarketRaw): number | null {
  const lpUsd = num(m.last_price_dollars);
  if (lpUsd > 0) return Math.round(lpUsd * 100);
  const yb = num(m.yes_bid_dollars);
  const ya = num(m.yes_ask_dollars);
  if (yb > 0 && ya > 0) return Math.round(((yb + ya) / 2) * 100);
  if (yb > 0) return Math.round(yb * 100);
  if (typeof m.last_price === "number" && m.last_price > 0) return m.last_price;
  if (typeof m.yes_bid === "number" && typeof m.yes_ask === "number" && m.yes_ask > 0)
    return Math.round((m.yes_bid + m.yes_ask) / 2);
  if (typeof m.yes_bid === "number" && m.yes_bid > 0) return m.yes_bid;
  return null;
}

function marketVolume(m: KalshiMarketRaw): number {
  return num(m.volume_fp) || num(m.volume);
}

/** Normalize raw Kalshi categories into the dashboard's category set. */
export function normalizeCategory(raw: string | undefined): string {
  const c = (raw ?? "").toLowerCase();
  if (c.includes("econ") || c.includes("financ") || c.includes("inflation"))
    return "Economics";
  if (c.includes("politic") || c.includes("elect") || c.includes("world") || c.includes("gov"))
    return "Politics";
  if (c.includes("sport") || c.includes("baseball") || c.includes("football") || c.includes("basketball") || c.includes("soccer") || c.includes("hockey"))
    return "Sports";
  if (c.includes("crypto")) return "Crypto";
  if (c.includes("entertain") || c.includes("culture") || c.includes("media") || c.includes("music") || c.includes("movie"))
    return "Culture";
  if (c.includes("climate") || c.includes("weather")) return "Climate";
  if (c.includes("tech") || c.includes("science") || c.includes("ai") || c.includes("space"))
    return "Science and Tech";
  if (c.includes("health")) return "Health";
  return "Culture";
}

// The events endpoint returns pages in roughly *farthest-expiry-first* order
// and is full of brand new zero-volume markets, so one page isn't enough for
// a quality grid. Page through several and cache the result between polls.
const EVENT_PAGES = 4;
const OUTCOMES_PER_EVENT_CARD = 2;

// Today's / live events (games, daily climate + crypto strikes, weekly TV)
// live at the very END of the events pagination — over 5000 events deep — so
// they are fetched separately through /markets close-time filters, which the
// events endpoint does not support.
// Bucket boundaries in hours from now. The markets endpoint returns
// farthest-close-FIRST within a window capped at 1000 rows, and a single
// hourly crypto strike ladder alone is ~1000 markets — so the first six
// hours are sampled hour-by-hour to guarantee live games, daily strikes,
// and today's events are all captured.
const NEAR_TERM_BUCKETS_H = [0, 1, 2, 3, 4, 5, 6, 12, 24, 48];
const NEAR_TERM_EVENT_LIMIT = 40;
const NEAR_TERM_MIN_VOL24H = 500;
// Kalshi rate-limits aggressive parallelism — fetch metadata in small,
// spaced batches (only uncached events cost anything).
const META_BATCH_SIZE = 8;
const META_BATCH_GAP_MS = 300;

export type DashboardData = {
  markets: DashboardMarket[];
  events: DashboardEvent[];
};

let marketsCache: { at: number; data: DashboardData } | null = null;
const MARKETS_CACHE_TTL_MS = 10_000;

type ValidContract = {
  raw: KalshiMarketRaw;
  ticker: string;
  yesPrice: number;
  volume: number;
  volume24h: number;
};

/** Tradable contracts of an event: priced, traded, not provisional/combo. */
function validContracts(ev: KalshiEventRaw): ValidContract[] {
  const out: ValidContract[] = [];
  for (const m of ev.markets ?? []) {
    if (!m.ticker || m.is_provisional || m.mve_collection_ticker) continue;
    const vol = marketVolume(m);
    if (vol <= 0) continue;
    const cents = priceCents(m);
    if (cents == null || cents < 1) continue;
    out.push({
      raw: m,
      ticker: m.ticker,
      yesPrice: Math.min(99, Math.max(1, cents)),
      volume: vol,
      volume24h: num(m.volume_24h_fp),
    });
  }
  return out;
}

/** Cached event metadata (title/category/series) — changes ~never. */
const eventMetaCache = new Map<
  string,
  { at: number; meta: { title: string; category?: string; series?: string } | null }
>();
const EVENT_META_TTL_MS = 6 * 3600_000;

async function fetchEventMeta(
  eventTicker: string,
): Promise<{ title: string; category?: string; series?: string } | null> {
  const hit = eventMetaCache.get(eventTicker);
  if (hit && Date.now() - hit.at < EVENT_META_TTL_MS) return hit.meta;
  const data = await fetchJson<{ event?: KalshiEventRaw }>(
    `${KALSHI_BASE}/events/${encodeURIComponent(eventTicker)}`,
    5000,
    { next: { revalidate: 3600 } },
  );
  const ev = data?.event;
  if (!ev?.title) return null; // transient failure — never negative-cache
  const meta = {
    title: ev.title,
    category: ev.category,
    series: ev.series_ticker,
  };
  eventMetaCache.set(eventTicker, { at: Date.now(), meta });
  return meta;
}

/**
 * Markets closing within the near-term window, grouped by event. Uses the
 * /markets endpoint — the only one supporting close-time filters. Buckets are
 * needed because results come farthest-close-first: one big window would only
 * ever surface its far edge.
 */
async function fetchNearTermMarketsByEvent(): Promise<
  Map<string, KalshiMarketRaw[]>
> {
  const nowS = Math.floor(Date.now() / 1000);
  const windows = NEAR_TERM_BUCKETS_H.slice(0, -1).map((startH, i) => ({
    startH,
    endH: NEAR_TERM_BUCKETS_H[i + 1],
  }));

  // Two waves instead of one burst — stays under Kalshi's rate limit while
  // the events pagination runs concurrently.
  const buckets: ({ markets?: KalshiMarketRaw[] } | null)[] = [];
  const WAVE = 4;
  for (let i = 0; i < windows.length; i += WAVE) {
    const wave = await Promise.all(
      windows.slice(i, i + WAVE).map(({ startH, endH }) =>
        fetchJson<{ markets?: KalshiMarketRaw[] }>(
          `${KALSHI_BASE}/markets?limit=1000&status=open` +
            `&min_close_ts=${nowS + startH * 3600}&max_close_ts=${nowS + endH * 3600}`,
          8000,
          { next: { revalidate: 30 } },
        ),
      ),
    );
    buckets.push(...wave);
    if (i + WAVE < windows.length) {
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  const byEvent = new Map<string, KalshiMarketRaw[]>();
  const seen = new Set<string>();
  for (const bucket of buckets) {
    for (const m of bucket?.markets ?? []) {
      if (!m.event_ticker || !m.ticker || seen.has(m.ticker)) continue;
      seen.add(m.ticker);
      const list = byEvent.get(m.event_ticker) ?? [];
      list.push(m);
      byEvent.set(m.event_ticker, list);
    }
  }
  return byEvent;
}

/** Rank near-term events by 24h volume and attach cached event metadata. */
async function buildNearTermEvents(
  byEvent: Map<string, KalshiMarketRaw[]>,
  skip: Set<string | undefined>,
): Promise<KalshiEventRaw[]> {
  const ranked = [...byEvent.entries()]
    .filter(([eventTicker]) => !skip.has(eventTicker))
    .map(([eventTicker, markets]) => ({
      eventTicker,
      markets,
      vol24h: markets.reduce((sum, m) => sum + num(m.volume_24h_fp), 0),
    }))
    .filter((e) => e.vol24h >= NEAR_TERM_MIN_VOL24H)
    .sort((a, b) => b.vol24h - a.vol24h)
    .slice(0, NEAR_TERM_EVENT_LIMIT);

  const out: KalshiEventRaw[] = [];
  for (let i = 0; i < ranked.length; i += META_BATCH_SIZE) {
    const batch = ranked.slice(i, i + META_BATCH_SIZE);
    await Promise.all(
      batch.map(async ({ eventTicker, markets }) => {
        const meta = await fetchEventMeta(eventTicker);
        if (!meta) return;
        out.push({
          event_ticker: eventTicker,
          series_ticker: meta.series,
          title: meta.title,
          category: meta.category,
          markets,
        });
      }),
    );
    if (i + META_BATCH_SIZE < ranked.length) {
      await new Promise((r) => setTimeout(r, META_BATCH_GAP_MS));
    }
  }
  return out;
}

/**
 * Fetch open Kalshi events for the dashboard grid, aggregated Kalshi-style:
 * one event card with its favored outcomes, total volume, and market count —
 * plus a flat market list (leaders + carded outcomes) that drives the live
 * price feed, search, and detail prefetching. Cached briefly server-side so
 * polling clients can't hammer Kalshi.
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  if (marketsCache && Date.now() - marketsCache.at < MARKETS_CACHE_TTL_MS) {
    return marketsCache.data;
  }

  // Popular long-dated events (pagination) and today's near-term markets
  // (close-time filtered) come from different endpoints — fetch in parallel.
  // Metadata lookups for near-term events wait until pagination is done so
  // the combined burst stays under Kalshi's rate limit.
  const nearTermPromise = fetchNearTermMarketsByEvent();

  const rawEvents: KalshiEventRaw[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < EVENT_PAGES; page++) {
    const url =
      `${KALSHI_BASE}/events?limit=200&status=open&with_nested_markets=true` +
      (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");
    const data = await fetchJson<{
      events?: KalshiEventRaw[];
      cursor?: string;
    }>(url, 8000, { next: { revalidate: 15 } });
    if (!data?.events?.length) break;
    rawEvents.push(...data.events);
    cursor = data.cursor;
    if (!cursor) break;
  }

  const knownEvents = new Set(rawEvents.map((e) => e.event_ticker));
  rawEvents.push(...(await buildNearTermEvents(await nearTermPromise, knownEvents)));

  const markets: DashboardMarket[] = [];
  const events: DashboardEvent[] = [];
  const seenTickers = new Set<string>();

  for (const ev of rawEvents) {
    if (!ev.event_ticker) continue;
    const category = normalizeCategory(ev.category);
    const contracts = validContracts(ev);
    if (contracts.length === 0) continue;

    // Leader = most recently traded contract (Kalshi homepage behavior).
    const leader = [...contracts].sort(
      (a, b) => b.volume24h - a.volume24h || b.volume - a.volume,
    )[0];

    // Favored outcomes shown on the card, highest probability first.
    const favored = [...contracts]
      .sort((a, b) => b.yesPrice - a.yesPrice || b.volume - a.volume)
      .slice(0, OUTCOMES_PER_EVENT_CARD);

    const totalVolume = contracts.reduce((sum, c) => sum + c.volume, 0);
    const volume24h = contracts.reduce((sum, c) => sum + c.volume24h, 0);

    events.push({
      eventTicker: ev.event_ticker,
      seriesTicker: ev.series_ticker ?? ev.event_ticker.split("-")[0],
      title: ev.title ?? ev.event_ticker,
      category,
      closeTime: leader.raw.close_time ?? "",
      totalVolume,
      volume24h,
      marketCount: contracts.length,
      outcomes: favored.map(
        (c): EventOutcome => ({
          ticker: c.ticker,
          name:
            contracts.length > 1
              ? c.raw.yes_sub_title || c.raw.title || c.ticker
              : c.raw.yes_sub_title || "Yes",
          yesPrice: c.yesPrice,
          volume: c.volume,
        }),
      ),
      leaderTicker: leader.ticker,
    });

    // Flat market entries: the leader plus every carded outcome, so the live
    // feed, search, and the detail pages all have prices for them.
    for (const c of [leader, ...favored]) {
      if (seenTickers.has(c.ticker)) continue;
      seenTickers.add(c.ticker);
      const outcomeName = c.raw.yes_sub_title;
      markets.push({
        ticker: c.ticker,
        question:
          contracts.length > 1 && outcomeName
            ? `${ev.title ?? c.raw.title} — ${outcomeName}`
            : c.raw.title || ev.title || c.ticker,
        category,
        yesPrice: c.yesPrice,
        noPrice: 100 - c.yesPrice,
        volume: c.volume,
        volume24h: c.volume24h,
        expiry: c.raw.close_time ?? "",
        // Real history is loaded per-market from the candlesticks endpoint;
        // until then the sparkline only accumulates live ticks (never mocked).
        sparklineData: [c.yesPrice],
        open24h: c.yesPrice,
      });
    }
  }

  const data: DashboardData = {
    markets: markets.sort((a, b) => b.volume - a.volume).slice(0, 900),
    events: events.sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 400),
  };
  if (data.events.length > 0) {
    marketsCache = { at: Date.now(), data };
  }
  return data;
}


/** Price history for one market via Kalshi candlesticks. Best-effort. */
export async function fetchMarketHistory(
  ticker: string,
  periodMinutes: number,
  startTs: number,
  endTs: number,
): Promise<{ t: number; p: number }[]> {
  // The candlesticks endpoint needs the series ticker — derive from market.
  const seriesTicker = ticker.split("-")[0];
  const data = await fetchJson<{ candlesticks?: CandlestickRaw[] }>(
    `${KALSHI_BASE}/series/${encodeURIComponent(seriesTicker)}/markets/${encodeURIComponent(ticker)}/candlesticks?start_ts=${startTs}&end_ts=${endTs}&period_interval=${periodMinutes}`,
    6000,
    { next: { revalidate: 30 } },
  );

  const points: { t: number; p: number }[] = [];
  for (const c of data?.candlesticks ?? []) {
    const ts = (c.end_period_ts ?? 0) * 1000;
    // Periods without trades carry only quotes/previous price — use those so
    // the line stays continuous instead of dropping points.
    const closeUsd =
      num(c.price?.close_dollars) ||
      num(c.yes_bid?.close_dollars) ||
      num(c.price?.previous_dollars);
    const close =
      closeUsd > 0
        ? Math.round(closeUsd * 100)
        : (c.price?.close ?? c.yes_bid?.close ?? 0);
    if (ts > 0 && close > 0) points.push({ t: ts, p: Math.min(99, Math.max(1, close)) });
  }
  return points;
}

/**
 * Full detail for one market: its own data plus every sibling outcome in the
 * same event (for multi-outcome markets), category, and resolution rules.
 */
export async function fetchMarketDetail(
  ticker: string,
): Promise<MarketDetail | null> {
  const marketData = await fetchJson<{ market?: KalshiMarketRaw }>(
    `${KALSHI_BASE}/markets/${encodeURIComponent(ticker)}`,
    6000,
    { next: { revalidate: 5 } },
  );
  const market = marketData?.market;
  if (!market?.ticker) return null;

  const cents = priceCents(market);
  const yes = cents == null ? 0 : Math.min(99, Math.max(1, cents));

  let category = "Markets";
  let eventTitle = market.title ?? ticker;
  let outcomes: MarketOutcome[] = [];

  if (market.event_ticker) {
    const eventData = await fetchJson<{ event?: KalshiEventRaw }>(
      `${KALSHI_BASE}/events/${encodeURIComponent(market.event_ticker)}?with_nested_markets=true`,
      6000,
      { next: { revalidate: 15 } },
    );
    const ev = eventData?.event;
    if (ev) {
      category = normalizeCategory(ev.category);
      eventTitle = ev.title ?? eventTitle;
      outcomes = (ev.markets ?? [])
        .map((m): MarketOutcome | null => {
          if (!m.ticker) return null;
          const c = priceCents(m);
          if (c == null) return null;
          const y = Math.min(99, Math.max(1, c));
          return {
            ticker: m.ticker,
            name: m.yes_sub_title || m.title || m.ticker,
            yesPrice: y,
            noPrice: 100 - y,
            prevPrice: Math.round(num(m.previous_price_dollars) * 100),
            volume: marketVolume(m),
          };
        })
        .filter((o): o is MarketOutcome => o !== null)
        .sort((a, b) => b.yesPrice - a.yesPrice || b.volume - a.volume)
        .slice(0, 40); // full board — World Cup style events have 30+ teams
    }
  }

  if (outcomes.length === 0 && yes > 0) {
    outcomes = [
      {
        ticker: market.ticker,
        name: market.yes_sub_title || market.title || market.ticker,
        yesPrice: yes,
        noPrice: 100 - yes,
        prevPrice: Math.round(num(market.previous_price_dollars) * 100),
        volume: marketVolume(market),
      },
    ];
  }

  return {
    ticker: market.ticker,
    question: market.title || eventTitle,
    eventTitle,
    category,
    yesPrice: yes,
    noPrice: 100 - yes,
    prevPrice: Math.round(num(market.previous_price_dollars) * 100),
    volume: marketVolume(market),
    volume24h: num(market.volume_24h_fp),
    expiry: market.close_time ?? "",
    status: market.status ?? "active",
    rulesPrimary: market.rules_primary ?? "",
    rulesSecondary: market.rules_secondary ?? "",
    outcomes,
  };
}

/** Current YES price for a single market — used for server-side order fills. */
export async function fetchMarketPrice(
  ticker: string,
): Promise<{ yesPrice: number; noPrice: number; question: string } | null> {
  const data = await fetchJson<{ market?: KalshiMarketRaw }>(
    `${KALSHI_BASE}/markets/${encodeURIComponent(ticker)}`,
    5000,
    { next: { revalidate: 2 } },
  );
  if (!data?.market) return null;
  const cents = priceCents(data.market);
  if (cents == null) return null;
  const yes = Math.min(99, Math.max(1, cents));
  return {
    yesPrice: yes,
    noPrice: 100 - yes,
    question: data.market.title ?? ticker,
  };
}
