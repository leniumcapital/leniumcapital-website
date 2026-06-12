import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchMarketHistory } from "@/lib/kalshi";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

// Kalshi candlesticks only accept period_interval of 1, 60, or 1440 minutes —
// anything else is a 400. Pick the finest valid interval for each range.
const RANGES: Record<string, { minutes: number; period: number }> = {
  "1H": { minutes: 60, period: 1 },
  "6H": { minutes: 360, period: 1 },
  "1D": { minutes: 1440, period: 60 },
  "1W": { minutes: 10080, period: 60 },
  ALL: { minutes: 43200, period: 1440 },
};

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
  const range =
    new URL(req.url).searchParams.get("range")?.toUpperCase() ?? "1D";
  const cfg = RANGES[range] ?? RANGES["1D"];

  const endTs = Math.floor(Date.now() / 1000);
  const startTs = endTs - cfg.minutes * 60;
  let points = await fetchMarketHistory(ticker, cfg.period, startTs, endTs);

  // Quiet markets may have no candles in a short window — widen to 30 days
  // of daily candles so the drawer always has a real chart when one exists.
  if (points.length < 2 && range !== "ALL") {
    points = await fetchMarketHistory(
      ticker,
      1440,
      endTs - 30 * 86400,
      endTs,
    );
  }

  return NextResponse.json({ points });
}
