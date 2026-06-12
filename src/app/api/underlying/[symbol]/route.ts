import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { UNDERLYING_SYMBOLS } from "@/lib/underlying";
import type { ChartRange } from "@/lib/marketDetail";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const RANGE_PARAMS: Record<ChartRange, { range: string; interval: string }> = {
  "1D": { range: "1d", interval: "5m" },
  "1W": { range: "5d", interval: "15m" },
  "1M": { range: "1mo", interval: "1h" },
  ALL: { range: "1y", interval: "1d" },
};

export type UnderlyingPayload = {
  spot: number;
  prevClose: number;
  currency: string;
  points: { t: number; p: number }[];
};

type YahooChart = {
  chart?: {
    result?: {
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketTime?: number;
        currency?: string;
      };
      timestamp?: number[];
      indicators?: { quote?: { close?: (number | null)[] }[] };
    }[];
  };
};

// Tiny in-memory cache so concurrent viewers don't hammer Yahoo.
const cache = new Map<string, { at: number; data: UnderlyingPayload }>();
const CACHE_TTL_MS = 4_000;

/** Live spot + history for an underlying instrument. Session required. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { symbol: rawSymbol } = await params;
  const symbol = decodeURIComponent(rawSymbol);
  if (!UNDERLYING_SYMBOLS.has(symbol)) {
    return NextResponse.json({ error: "Unknown symbol" }, { status: 400 });
  }

  const url = new URL(req.url);
  const range = (url.searchParams.get("range") ?? "1D") as ChartRange;
  const yahooParams = RANGE_PARAMS[range] ?? RANGE_PARAMS["1D"];

  const cacheKey = `${symbol}:${range}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json(hit.data, {
      headers: { "Cache-Control": "private, max-age=3" },
    });
  }

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${yahooParams.range}&interval=${yahooParams.interval}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Lenium/1.0)" },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!res.ok) throw new Error(`Yahoo responded ${res.status}`);
    const json = (await res.json()) as YahooChart;
    const result = json.chart?.result?.[0];
    if (!result?.meta) throw new Error("No chart result");

    const timestamps = result.timestamp ?? [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const points: { t: number; p: number }[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const p = closes[i];
      if (p != null && Number.isFinite(p)) {
        points.push({ t: timestamps[i] * 1000, p });
      }
    }

    const spot = result.meta.regularMarketPrice ?? points.at(-1)?.p ?? 0;
    // Make the last point reflect the live spot so the line is current.
    const spotTs = (result.meta.regularMarketTime ?? 0) * 1000;
    if (spot > 0 && points.length > 0 && spotTs > points[points.length - 1].t) {
      points.push({ t: spotTs, p: spot });
    }

    const data: UnderlyingPayload = {
      spot,
      prevClose:
        result.meta.chartPreviousClose ?? result.meta.previousClose ?? 0,
      currency: result.meta.currency ?? "USD",
      points,
    };
    cache.set(cacheKey, { at: Date.now(), data });

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=3" },
    });
  } catch (e) {
    console.error(`underlying ${symbol} failed:`, e);
    // Serve stale data over an error if we have it.
    if (hit) return NextResponse.json(hit.data);
    return NextResponse.json(
      { error: "Failed to load price data" },
      { status: 502 },
    );
  }
}
