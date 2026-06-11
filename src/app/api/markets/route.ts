import { NextResponse } from "next/server";
import { FALLBACK_TICKERS, type TickerMarket } from "@/lib/data";

// Always run on each request; we cache the upstream Kalshi call briefly below.
export const dynamic = "force-dynamic";
// Give the function enough headroom for the upstream Kalshi calls.
export const maxDuration = 20;

const KALSHI_BASE =
  process.env.KALSHI_API_BASE ??
  "https://api.elections.kalshi.com/trade-api/v2";

// Some upstreams 403 bare datacenter requests with no UA — look like a browser.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36";

type KalshiMarketRaw = {
  ticker?: string;
  title?: string;
  yes_sub_title?: string;
  last_price?: number;
  yes_bid?: number;
  yes_ask?: number;
  volume?: number;
  volume_24h?: number;
  dollar_volume?: number;
  close_time?: string;
};

type KalshiEventRaw = {
  event_ticker?: string;
  title?: string;
  category?: string;
  markets?: KalshiMarketRaw[];
};

type KalshiEventMetadata = {
  image_url?: string;
  featured_image_url?: string;
  market_details?: { image_url?: string; color_code?: string }[];
};

// Last upstream diagnostic, surfaced via ?debug=1 so we can see why on Vercel.
let lastDiag = "";

/** fetch() with a hard timeout so a slow/hanging upstream can never stall us. */
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
      headers: { Accept: "application/json", "User-Agent": UA, ...(init?.headers ?? {}) },
    });
    lastDiag = `status=${res.status}`;
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    lastDiag = `error=${(e as Error)?.name}:${(e as Error)?.message}`;
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Make a Kalshi image path absolute so an <img> can load it directly. */
function absoluteImage(url: string | undefined, base: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  try {
    if (url.startsWith("/")) return `${new URL(base).origin}${url}`;
  } catch {
    /* ignore */
  }
  return url;
}

/** Fetch the real Kalshi icon + color for one event. Best-effort, time-boxed. */
async function fetchEventIcon(
  eventTicker: string,
): Promise<{ image?: string; color?: string }> {
  const meta = await fetchJson<KalshiEventMetadata>(
    `${KALSHI_BASE}/events/${encodeURIComponent(eventTicker)}/metadata`,
    2500,
    { next: { revalidate: 300 } }, // icons rarely change — cache 5 min
  );
  if (!meta) return {};
  const raw =
    meta.image_url ||
    meta.featured_image_url ||
    meta.market_details?.find((m) => m.image_url)?.image_url;
  return {
    image: absoluteImage(raw, KALSHI_BASE),
    color: meta.market_details?.find((m) => m.color_code)?.color_code,
  };
}

function formatClose(t?: string): string {
  if (!t) return "";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function priceCents(m: KalshiMarketRaw): number | null {
  if (typeof m.last_price === "number" && m.last_price > 0) return m.last_price;
  if (typeof m.yes_bid === "number" && typeof m.yes_ask === "number" && m.yes_ask > 0)
    return Math.round((m.yes_bid + m.yes_ask) / 2);
  if (typeof m.yes_bid === "number" && m.yes_bid > 0) return m.yes_bid;
  return null;
}

function mapEvents(events: KalshiEventRaw[]): TickerMarket[] {
  const out: TickerMarket[] = [];
  for (const ev of events) {
    const markets = Array.isArray(ev.markets) ? ev.markets : [];
    if (!markets.length) continue;

    // Headline price comes from the most-traded market in the event.
    const top = [...markets].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))[0];
    const cents = priceCents(top);
    if (cents == null) continue;

    const vol = markets.reduce((s, m) => s + (m.volume ?? 0), 0);
    const closes = formatClose(
      markets
        .map((m) => m.close_time)
        .filter(Boolean)
        .sort()[0],
    );

    out.push({
      id: ev.event_ticker ?? top.ticker ?? ev.title ?? Math.random().toString(36),
      category: ev.category ?? "Markets",
      title: ev.title ?? top.title ?? "Kalshi market",
      closes,
      yes: Math.min(99, Math.max(1, Math.round(cents))),
      vol,
      markets: markets.length,
    });
  }
  return out;
}

export async function GET(req: Request) {
  const debug = new URL(req.url).searchParams.get("debug");

  const data = await fetchJson<{ events?: KalshiEventRaw[] }>(
    `${KALSHI_BASE}/events?limit=60&status=open&with_nested_markets=true`,
    8000,
    { next: { revalidate: 5 } }, // cache so many clients don't hammer Kalshi
  );

  const eventCount = data?.events?.length ?? 0;
  const mapped = mapEvents(data?.events ?? [])
    .filter((m) => m.title && m.vol >= 0)
    .sort((a, b) => b.vol - a.vol)
    .slice(0, 12);

  if (debug) {
    return NextResponse.json({
      base: KALSHI_BASE,
      upstream: lastDiag,
      eventCount,
      mappedCount: mapped.length,
      sampleEvent: data?.events?.[0] ?? null,
    });
  }

  // No live data available — keep the hero alive with the static set.
  if (!mapped.length) {
    return NextResponse.json({ source: "fallback", markets: FALLBACK_TICKERS });
  }

  // Pull real Kalshi icons in parallel. Each call is time-boxed and best-effort,
  // so missing/slow icons can never block (or fail) the live prices.
  const withIcons = await Promise.all(
    mapped.map(async (m) => ({ ...m, ...(await fetchEventIcon(m.id)) })),
  );

  return NextResponse.json({ source: "kalshi", markets: withIcons });
}
