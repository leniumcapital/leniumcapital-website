import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchMarketDetail } from "@/lib/kalshi";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

/** Full detail for one market (incl. event outcomes). Session required. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ticker } = await params;
  try {
    const market = await fetchMarketDetail(ticker);
    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }
    return NextResponse.json(
      { market },
      { headers: { "Cache-Control": "private, max-age=5" } },
    );
  } catch (e) {
    console.error("market detail failed:", e);
    return NextResponse.json(
      { error: "Failed to load market" },
      { status: 500 },
    );
  }
}
