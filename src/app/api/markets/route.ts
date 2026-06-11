import { NextResponse } from "next/server";
import { FALLBACK_TICKERS, type TickerMarket } from "@/lib/data";

// Always run on each request; we cache the upstream Kalshi call briefly below.
export const dynamic = "force-dynamic";

const KALSHI_BASE =
  process.env.KALSHI_API_BASE ??
  "https://api.elections.kalshi.com/trade-api/v2";

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

/** Fetch the real Kalshi icon + color for one event. Best-effort. */
async function fetchEventIcon(
  eventTicker: string,
): Promise<{ image?: string; color?: string }> {
  try {
    const res = await fetch(
      `${KALSHI_BASE}/events/${encodeURIComponent(eventTicker)}/metadata`,
      {
        headers: { Accept: "application/json" },
        // Icons rarely change — cache them for 5 minutes.
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return {};
    const meta = (await res.json()) as KalshiEventMetadata;
    const raw =
      meta.image_url ||
      meta.featured_image_url ||
      meta.market_details?.find((m) => m.image_url)?.image_url;
    return {
      image: absoluteImage(raw, KALSHI_BASE),
      color: meta.market_details?.find((m) => m.color_code)?.color_code,
    };
  } catch {
    return {};
  }
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
    const top = [...markets].sort(
      (a, b) => (b.volume ?? 0) - (a.volume ?? 0),
    )[0];
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

export async function GET() {
  try {
    const url = `${KALSHI_BASE}/events?limit=100&status=open&with_nested_markets=true`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      // Cache the upstream call for a few seconds so many clients don't hammer Kalshi.
      next: { revalidate: 5 },
    });
    if (!res.ok) throw new Error(`Kalshi responded ${res.status}`);

    const data = (await res.json()) as { events?: KalshiEventRaw[] };
    const mapped = mapEvents(data.events ?? [])
      .filter((m) => m.title && m.vol >= 0)
      .sort((a, b) => b.vol - a.vol)
      .slice(0, 16);

    if (!mapped.length) throw new Error("No usable markets from Kalshi");

    // Pull the real Kalshi icon for each selected event (cached, in parallel).
    const withIcons = await Promise.all(
      mapped.map(async (m) => ({ ...m, ...(await fetchEventIcon(m.id)) })),
    );

    return NextResponse.json({ source: "kalshi", markets: withIcons });
  } catch {
    // Network blocked, rate-limited, or shape changed — keep the hero alive.
    return NextResponse.json({ source: "fallback", markets: FALLBACK_TICKERS });
  }
}
