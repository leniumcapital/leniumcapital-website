import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchDashboardMarkets } from "@/lib/kalshi";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/** Live market list for the dashboard grid. Session required. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const markets = await fetchDashboardMarkets();
  return NextResponse.json({ markets });
}
