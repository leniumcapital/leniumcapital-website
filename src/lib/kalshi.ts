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

// The events endpoint returns pages in arbitrary order and is full of brand
// new zero-volume markets, so one page isn't enough for a quality grid. Page
// through several and cache the computed result in-memory between polls.
const EVENT_PAGES = 4;
const OUTCOMES_PER_EVENT_CARD = 2;

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
