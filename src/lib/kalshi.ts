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
};

type KalshiEventRaw = {
  event_ticker?: string;
  title?: string;
  category?: string;
  markets?: KalshiMarketRaw[];
};

type CandlestickRaw = {
  end_period_ts?: number;
  price?: { close?: number; close_dollars?: string };
  yes_bid?: { close?: number };
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

/**
 * Deterministic synthetic 24h sparkline ending at the current price. Used
 * until per-market candlestick history loads — never random between renders.
 */
function seedSparkline(ticker: string, current: number): number[] {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) | 0;
  const out: number[] = [];
  let p = current;
  for (let i = 23; i >= 0; i--) {
    const wave = Math.sin((h % 7) + i * 0.7) * 1.6 + Math.sin(i * 0.23 + h) * 0.9;
    out.unshift(Math.min(99, Math.max(1, Math.round(p - wave))));
    p = out[0];
  }
  out[out.length - 1] = current;
  return out;
}

/**
 * Fetch open Kalshi markets, flattened to individual contracts for the
 * dashboard grid. Cached briefly server-side so clients can't hammer Kalshi.
 */
export async function fetchDashboardMarkets(): Promise<DashboardMarket[]> {
  const data = await fetchJson<{ events?: KalshiEventRaw[] }>(
    `${KALSHI_BASE}/events?limit=200&status=open&with_nested_markets=true`,
    8000,
    { next: { revalidate: 5 } },
  );

  const out: DashboardMarket[] = [];
  for (const ev of data?.events ?? []) {
    const category = normalizeCategory(ev.category);
    for (const m of ev.markets ?? []) {
      if (!m.ticker) continue;
      const cents = priceCents(m);
      if (cents == null) continue;
      const yes = Math.min(99, Math.max(1, cents));
      const spark = seedSparkline(m.ticker, yes);
      out.push({
        ticker: m.ticker,
        question: m.title || ev.title || m.ticker,
        category,
        yesPrice: yes,
        noPrice: 100 - yes,
        volume: marketVolume(m),
        expiry: m.close_time ?? "",
        sparklineData: spark,
        open24h: spark[0],
      });
    }
  }
  return out.sort((a, b) => b.volume - a.volume).slice(0, 600);
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
    const closeUsd = num(c.price?.close_dollars);
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
