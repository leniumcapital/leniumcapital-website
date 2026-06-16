import { NextResponse } from "next/server";
import { resolveIconForOutcome } from "@/lib/icon-resolvers";

export const runtime = "nodejs";

/** Resolve an outcome icon URL from cache or external sources. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim();
  const category = searchParams.get("category")?.trim();
  const ticker = searchParams.get("ticker")?.trim() ?? null;
  const series = searchParams.get("series")?.trim() ?? null;
  const context = searchParams.get("context")?.trim() ?? null;

  if (!name || !category) {
    return NextResponse.json(
      { error: "name and category are required" },
      { status: 400 },
    );
  }

  const url = await resolveIconForOutcome(
    name,
    category,
    null,
    ticker,
    series,
    context,
  );
  const headers: Record<string, string> = {};
  if (url) {
    headers["Cache-Control"] = "public, max-age=86400";
  }

  return NextResponse.json({ url }, { headers });
}
