import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchDashboardData } from "@/lib/kalshi";
import { backgroundIconPrefetchFromEvents } from "@/lib/icon-resolvers";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Live events + market list for the dashboard grid. Session required. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { markets, events } = await fetchDashboardData();
  if (events.length === 0) {
    // Upstream failed or returned nothing usable — let the client show its
    // error state instead of an endless skeleton.
    return NextResponse.json(
      { error: "No markets available" },
      { status: 502 },
    );
  }

  const origin = new URL(req.url).origin;
  backgroundIconPrefetchFromEvents(
    events,
    req.headers.get("cookie"),
    origin,
  );

  return NextResponse.json(
    { markets, events },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
