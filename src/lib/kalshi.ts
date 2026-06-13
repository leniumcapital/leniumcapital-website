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
import {
  structuredTargetId,
  structuredTargetImageKey,
  structuredTargetUrl,
  type StructuredTargetData,
} from "@/lib/kalshiImages";
import {
  KALSHI_SERIES_CATEGORY,
  normalizePrimaryCategory,
  detectSubCategory,
  type SeriesInfo,
} from "@/lib/marketCategories";

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
  /** When the underlying event actually happens (game end) — close_time on
   * sports markets is the settlement deadline, often weeks later. */
  expected_expiration_time?: string;
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
  strike_type?: string;
  custom_strike?: Record<string, string>;
};

type KalshiEventRaw = {
  event_ticker?: string;
  series_ticker?: string;
  title?: string;
  category?: string;
  mutually_exclusive?: boolean;
  markets?: KalshiMarketRaw[];
  /** Set on events from the curated game series (keeps untraded games). */
  is_game?: boolean;
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

/** @deprecated Use normalizePrimaryCategory from marketCategories. */
export function normalizeCategory(raw: string | undefined): string {
  return normalizePrimaryCategory(raw);
}

/** Series directories (ticker → title/tags) for subcategory detection. Cached 6h. */
let seriesDirCache: { at: number; map: Map<string, SeriesInfo> } | null = null;
const SERIES_DIR_TTL_MS = 6 * 3600_000;

async function fetchAllSeriesDirectories(): Promise<Map<string, SeriesInfo>> {
  if (seriesDirCache && Date.now() - seriesDirCache.at < SERIES_DIR_TTL_MS) {
    return seriesDirCache.map;
  }
  const kalshiCategories = [
    ...new Set(
      Object.values(KALSHI_SERIES_CATEGORY).filter(
        (c): c is string => typeof c === "string" && c.length > 0,
      ),
    ),
  ];
  const map = new Map<string, SeriesInfo>();
  const WAVE = 3;
  for (let i = 0; i < kalshiCategories.length; i += WAVE) {
    const wave = await Promise.all(
      kalshiCategories.slice(i, i + WAVE).map((category) =>
        fetchJson<{
          series?: { ticker?: string; title?: string; tags?: string[] }[];
        }>(
          `${KALSHI_BASE}/series?category=${encodeURIComponent(category)}`,
          10000,
          { next: { revalidate: 21600 } },
        ),
      ),
    );
    for (const data of wave) {
      for (const s of data?.series ?? []) {
        if (s.ticker) {
          map.set(s.ticker, { title: s.title ?? "", tags: s.tags ?? [] });
        }
      }
    }
    if (i + WAVE < kalshiCategories.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  if (map.size > 0) seriesDirCache = { at: Date.now(), map };
  return seriesDirCache?.map ?? map;
}

// Game-level series for the major leagues, fetched directly so live and
// upcoming games always make the grid (the generic near-term scan gets
// flooded by thousand-row parlay ladders and misses them).
const SPORTS_GAME_SERIES = [
  "KXWCGAME", // FIFA World Cup
  "KXCLUBWCGAME", // FIFA Club World Cup
  "KXNBAGAME",
  "KXWNBAGAME",
  "KXMLBGAME",
  "KXNHLGAME",
  "KXNFLGAME",
  "KXNCAAFGAME",
  "KXNCAAMBGAME",
  "KXMLSGAME",
  "KXUCLGAME",
  "KXEPLGAME",
  "KXLALIGAGAME",
  "KXSERIEAGAME",
  "KXBUNDESLIGAGAME",
  "KXLIGUE1GAME",
  "KXATPMATCH",
  "KXWTAMATCH",
  "KXUFCFIGHT",
  "KXNASCARRACE",
];
const SPORTS_GAME_HORIZON_H = 7 * 24;
// Keep games whose expected end passed recently — overtime runs long.
const SPORTS_GAME_GRACE_H = 6;

/** When the underlying game actually happens. close_time on sports markets
 * is the settlement deadline — often weeks after the final whistle. */
function gameTime(m: KalshiMarketRaw): string {
  return m.expected_expiration_time || m.close_time || "";
}

/**
 * Open markets in the major game series with games inside the horizon.
 * close-time filters are useless here (settlement deadlines), so each series
 * is fetched whole and filtered by expected_expiration_time.
 */
async function fetchSportsGameMarkets(): Promise<KalshiMarketRaw[]> {
  const now = Date.now();
  const minMs = now - SPORTS_GAME_GRACE_H * 3600_000;
  const maxMs = now + SPORTS_GAME_HORIZON_H * 3600_000;
  const out: KalshiMarketRaw[] = [];
  const WAVE = 4;
  for (let i = 0; i < SPORTS_GAME_SERIES.length; i += WAVE) {
    const wave = await Promise.all(
      SPORTS_GAME_SERIES.slice(i, i + WAVE).map((series) =>
        fetchJson<{ markets?: KalshiMarketRaw[] }>(
          `${KALSHI_BASE}/markets?limit=200&status=open&series_ticker=${series}`,
          8000,
          { next: { revalidate: 60 } },
        ),
      ),
    );
    for (const res of wave) {
      for (const m of res?.markets ?? []) {
        const t = new Date(gameTime(m)).getTime();
        if (Number.isFinite(t) && t >= minMs && t <= maxMs) out.push(m);
      }
    }
    if (i + WAVE < SPORTS_GAME_SERIES.length) {
      await new Promise((r) => setTimeout(r, 350));
    }
  }
  return out;
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
const NEAR_TERM_EVENT_LIMIT = 80;
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
function validContracts(
  ev: KalshiEventRaw,
  allowUntraded = false,
): ValidContract[] {
  const out: ValidContract[] = [];
  for (const m of ev.markets ?? []) {
    if (!m.ticker || m.is_provisional || m.mve_collection_ticker) continue;
    const vol = marketVolume(m);
    // Upcoming games are quoted before anyone trades them — keep those.
    if (vol <= 0 && !allowUntraded) continue;
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

// Structured targets (team flags, logos) — stable, cache aggressively.
const structuredTargetCache = new Map<
  string,
  { at: number; data: StructuredTargetData | null }
>();
const STRUCTURED_TARGET_TTL_MS = 6 * 3600_000;

async function fetchStructuredTarget(
  id: string,
): Promise<StructuredTargetData | null> {
  const hit = structuredTargetCache.get(id);
  if (hit && Date.now() - hit.at < STRUCTURED_TARGET_TTL_MS) return hit.data;
  const data = await fetchJson<{ structured_target?: StructuredTargetData }>(
    `${KALSHI_BASE}/structured_targets/${encodeURIComponent(id)}`,
    5000,
    { next: { revalidate: 3600 } },
  );
  const target = data?.structured_target ?? null;
  if (target) structuredTargetCache.set(id, { at: Date.now(), data: target });
  return target;
}

/** Fetch many structured targets in spaced batches (rate-limit safe). */
async function batchFetchStructuredTargets(
  ids: Iterable<string>,
): Promise<Map<string, StructuredTargetData>> {
  const unique = [...new Set(ids)];
  const out = new Map<string, StructuredTargetData>();
  for (let i = 0; i < unique.length; i += META_BATCH_SIZE) {
    const batch = unique.slice(i, i + META_BATCH_SIZE);
    await Promise.all(
      batch.map(async (id) => {
        const target = await fetchStructuredTarget(id);
        if (target) out.set(id, target);
      }),
    );
    if (i + META_BATCH_SIZE < unique.length) {
      await new Promise((r) => setTimeout(r, META_BATCH_GAP_MS));
    }
  }
  return out;
}

function resolveOutcomeImageUrl(
  market: KalshiMarketRaw,
  seriesTicker: string,
  targets: Map<string, StructuredTargetData>,
): string | undefined {
  const id = structuredTargetId(market.custom_strike);
  if (!id) return undefined;
  const target = targets.get(id);
  if (!target) return undefined;
  const key = structuredTargetImageKey(target, seriesTicker);
  return key ? structuredTargetUrl(key) : undefined;
}

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

/** Game events (one per matchup) from the major-league series, soonest first. */
async function buildSportsGameEvents(
  markets: KalshiMarketRaw[],
  skip: Set<string | undefined>,
): Promise<KalshiEventRaw[]> {
  const byEvent = new Map<string, KalshiMarketRaw[]>();
  for (const m of markets) {
    if (!m.event_ticker || !m.ticker) continue;
    const list = byEvent.get(m.event_ticker) ?? [];
    list.push(m);
    byEvent.set(m.event_ticker, list);
  }

  // No volume floor — tomorrow's games matter even before they're traded.
  // Soonest close first so live games get meta priority within the cap.
  const ranked = [...byEvent.entries()]
    .filter(([eventTicker]) => !skip.has(eventTicker))
    .map(([eventTicker, ms]) => ({
      eventTicker,
      markets: ms,
      closeMs: Math.min(
        ...ms.map((m) => new Date(gameTime(m) || 8.64e15).getTime()),
      ),
    }))
    .sort((a, b) => a.closeMs - b.closeMs)
    .slice(0, 150);

  const out: KalshiEventRaw[] = [];
  for (let i = 0; i < ranked.length; i += META_BATCH_SIZE) {
    const batch = ranked.slice(i, i + META_BATCH_SIZE);
    await Promise.all(
      batch.map(async ({ eventTicker, markets: ms }) => {
        const meta = await fetchEventMeta(eventTicker);
        if (!meta) return;
        out.push({
          event_ticker: eventTicker,
          series_ticker: meta.series,
          title: meta.title,
          category: meta.category ?? "Sports",
          markets: ms,
          is_game: true,
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

  // Popular long-dated events (pagination), today's near-term markets
  // (close-time filtered), and this week's games in the major sports series
  // come from different endpoints — fetch in parallel. Metadata lookups wait
  // until pagination is done so the combined burst stays under Kalshi's
  // rate limit.
  const nearTermPromise = fetchNearTermMarketsByEvent();
  const sportsGamesPromise = fetchSportsGameMarkets();
  const seriesDirPromise = fetchAllSeriesDirectories();

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

  const knownAfterNearTerm = new Set(rawEvents.map((e) => e.event_ticker));
  rawEvents.push(
    ...(await buildSportsGameEvents(await sportsGamesPromise, knownAfterNearTerm)),
  );
  const seriesDir = await seriesDirPromise;

  // Pre-fetch structured targets for carded outcomes (flags, logos, photos).
  const structuredIds: string[] = [];
  for (const ev of rawEvents) {
    if (!ev.event_ticker) continue;
    for (const c of validContracts(ev, ev.is_game).slice(0, 8)) {
      const id = structuredTargetId(c.raw.custom_strike);
      if (id) structuredIds.push(id);
    }
  }
  const structuredTargets = await batchFetchStructuredTargets(structuredIds);

  const markets: DashboardMarket[] = [];
  const events: DashboardEvent[] = [];
  const seenTickers = new Set<string>();

  for (const ev of rawEvents) {
    if (!ev.event_ticker) continue;
    const category = normalizePrimaryCategory(ev.category);
    const contracts = validContracts(ev, ev.is_game);
    if (contracts.length === 0) continue;

    // Leader = most recently traded contract (Kalshi homepage behavior).
    const leader = [...contracts].sort(
      (a, b) => b.volume24h - a.volume24h || b.volume - a.volume,
    )[0];

    // Favored outcomes shown on the card. Nominal events (nominees, teams)
    // show the highest-probability outcomes, Kalshi-style. Price-ladder
    // events (BTC at 5pm, temperature strikes) would always surface boring
    // ~99% deep strikes that way — rank those by traded volume instead so
    // the at-the-money strikes people actually trade appear.
    const looksLikeLadder =
      contracts.length > 6 &&
      contracts.filter((c) => c.yesPrice >= 97).length >= 3;
    const favored = [...contracts]
      .sort(
        looksLikeLadder
          ? (a, b) => b.volume - a.volume || b.volume24h - a.volume24h
          : (a, b) => b.yesPrice - a.yesPrice || b.volume - a.volume,
      )
      .slice(0, OUTCOMES_PER_EVENT_CARD);

    const totalVolume = contracts.reduce((sum, c) => sum + c.volume, 0);
    const volume24h = contracts.reduce((sum, c) => sum + c.volume24h, 0);

    const seriesTicker = ev.series_ticker ?? ev.event_ticker.split("-")[0];
    const seriesInfo = seriesDir.get(seriesTicker);
    const subCategory = detectSubCategory(
      category,
      seriesTicker,
      ev.title,
      seriesInfo,
    );
    events.push({
      eventTicker: ev.event_ticker,
      seriesTicker,
      title: ev.title ?? ev.event_ticker,
      category,
      subCategory,
      closeTime: ev.is_game
        ? gameTime(leader.raw)
        : (leader.raw.close_time ?? ""),
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
          imageUrl: resolveOutcomeImageUrl(
            c.raw,
            seriesTicker,
            structuredTargets,
          ),
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
        expiry: ev.is_game ? gameTime(c.raw) : (c.raw.close_time ?? ""),
        // Real history is loaded per-market from the candlesticks endpoint;
        // until then the sparkline only accumulates live ticks (never mocked).
        sparklineData: [c.yesPrice],
        open24h: c.yesPrice,
      });
    }
  }

  const data: DashboardData = {
    markets: markets.sort((a, b) => b.volume - a.volume).slice(0, 1100),
    events: events.sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 600),
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
      category = normalizePrimaryCategory(ev.category);
      eventTitle = ev.title ?? eventTitle;
      const seriesTicker =
        ev.series_ticker ?? market.event_ticker?.split("-")[0] ?? "";
      const rawMarkets = (ev.markets ?? []).filter((m) => m.ticker);
      const stIds = rawMarkets
        .map((m) => structuredTargetId(m.custom_strike))
        .filter((id): id is string => id != null);
      const structuredTargets = await batchFetchStructuredTargets(stIds);

      outcomes = rawMarkets
        .map((m): MarketOutcome | null => {
          const c = priceCents(m);
          if (c == null) return null;
          const y = Math.min(99, Math.max(1, c));
          return {
            ticker: m.ticker!,
            name: m.yes_sub_title || m.title || m.ticker!,
            imageUrl: resolveOutcomeImageUrl(m, seriesTicker, structuredTargets),
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
    const seriesTicker = market.event_ticker?.split("-")[0] ?? "";
    const stIds = structuredTargetId(market.custom_strike);
    const structuredTargets = stIds
      ? await batchFetchStructuredTargets([stIds])
      : new Map<string, StructuredTargetData>();
    outcomes = [
      {
        ticker: market.ticker,
        name: market.yes_sub_title || market.title || market.ticker,
        imageUrl: resolveOutcomeImageUrl(market, seriesTicker, structuredTargets),
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
