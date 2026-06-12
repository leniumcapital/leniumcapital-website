import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchDashboardMarkets } from "@/lib/kalshi";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Live market list for the dashboard grid. Session required. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const markets = await fetchDashboardMarkets();
  if (markets.length === 0) {
    // Upstream failed or returned nothing usable — let the client show its
    // error state instead of an endless skeleton.
    return NextResponse.json(
      { error: "No markets available" },
      { status: 502 },
    );
  }
  return NextResponse.json(
    { markets },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
