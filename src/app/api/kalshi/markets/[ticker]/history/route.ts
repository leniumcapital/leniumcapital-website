import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchMarketHistory } from "@/lib/kalshi";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

// Kalshi candlesticks only accept period_interval of 1, 60, or 1440 minutes.
const RANGES: Record<string, { minutes: number; period: number }> = {
  "1D": { minutes: 1440, period: 1 },
  "1W": { minutes: 10080, period: 60 },
  "1M": { minutes: 43200, period: 1440 },
  ALL: { minutes: 129600, period: 1440 },
};
const VALID_PERIODS = new Set([1, 60, 1440]);

/** Candlestick price history for one market. Session required. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ticker } = await params;
  const url = new URL(req.url);
  const range = url.searchParams.get("range")?.toUpperCase() ?? "1D";
  const cfg = RANGES[range] ?? RANGES["1D"];

  // Optional explicit period_interval override (clamped to valid values).
  const periodParam = Number(url.searchParams.get("period_interval"));
  const period = VALID_PERIODS.has(periodParam) ? periodParam : cfg.period;

  const endTs = Math.floor(Date.now() / 1000);
  const startTs = endTs - cfg.minutes * 60;

  try {
    let points = await fetchMarketHistory(ticker, period, startTs, endTs);
    // Quiet markets may have no candles in a short window — widen to daily
    // candles over 90 days so the chart always has data when any exists.
    if (points.length < 2 && range !== "ALL") {
      points = await fetchMarketHistory(
        ticker,
        1440,
        endTs - 90 * 86400,
        endTs,
      );
    }
    return NextResponse.json(
      { points },
      { headers: { "Cache-Control": "private, max-age=30" } },
    );
  } catch (e) {
    console.error("market history failed:", e);
    return NextResponse.json(
      { error: "Failed to load history" },
      { status: 500 },
    );
  }
}
