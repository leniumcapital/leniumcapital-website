/**
 * Server-side Kalshi API layer. This module must only ever be imported from
 * API routes or server components — it reads credentials from env vars and
 * talks to Kalshi directly. Client code goes through /api/kalshi/* instead.
 */
import "server-only";

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
  close_time?: string;
  last_price_dollars?: string;
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
  title?: string;
  category?: string;
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
let marketsCache: { at: number; data: DashboardMarket[] } | null = null;
const MARKETS_CACHE_TTL_MS = 10_000;

/**
 * Fetch open Kalshi markets for the dashboard grid: the leading contract of
 * every traded event, sorted by volume. Cached briefly server-side so
 * polling clients can't hammer Kalshi.
 */
export async function fetchDashboardMarkets(): Promise<DashboardMarket[]> {
  if (marketsCache && Date.now() - marketsCache.at < MARKETS_CACHE_TTL_MS) {
    return marketsCache.data;
  }

  const events: KalshiEventRaw[] = [];
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
    events.push(...data.events);
    cursor = data.cursor;
    if (!cursor) break;
  }

  const out: DashboardMarket[] = [];
  for (const ev of events) {
    const category = normalizeCategory(ev.category);

    // Pick the leading (most-traded) contract per event, the way Kalshi's
    // own homepage does. Flattening every nested outcome floods the grid
    // with illiquid 1¢ legs that read as broken data. Skip provisional
    // markets, multivariate combo legs, and anything with zero volume or
    // no real price — those never render.
    let best: KalshiMarketRaw | null = null;
    let bestYes = 0;
    let bestVol = -1;
    let bestVol24 = -1;
    for (const m of ev.markets ?? []) {
      if (!m.ticker || m.is_provisional || m.mve_collection_ticker) continue;
      const vol = marketVolume(m);
      if (vol <= 0) continue;
      const cents = priceCents(m);
      if (cents == null || cents < 1) continue;
      const vol24 = num(m.volume_24h_fp);
      if (vol24 > bestVol24 || (vol24 === bestVol24 && vol > bestVol)) {
        best = m;
        bestYes = Math.min(99, Math.max(1, cents));
        bestVol = vol;
        bestVol24 = vol24;
      }
    }
    if (!best?.ticker) continue;

    out.push({
      ticker: best.ticker,
      question: best.title || ev.title || best.ticker,
      category,
      yesPrice: bestYes,
      noPrice: 100 - bestYes,
      volume: bestVol,
      volume24h: bestVol24,
      expiry: best.close_time ?? "",
      // Real history is loaded per-market from the candlesticks endpoint;
      // until then the sparkline only accumulates live ticks (never mocked).
      sparklineData: [bestYes],
      open24h: bestYes,
    });
  }

  const sorted = out.sort((a, b) => b.volume - a.volume).slice(0, 600);
  if (sorted.length > 0) {
    marketsCache = { at: Date.now(), data: sorted };
  }
  return sorted;
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
