import { NextResponse } from "next/server";
import { resolveOptionImage } from "@/lib/optionImageResolver";

export const runtime = "nodejs";

/**
 * Resolve an option image URL via category-specific external APIs.
 * Client caches results in memory — one lookup per unique option label.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim();
  const category = searchParams.get("category")?.trim() ?? "";
  const ticker = searchParams.get("ticker")?.trim() ?? undefined;

  if (!name) {
    return NextResponse.json({ url: null }, { status: 400 });
  }

  const url = await resolveOptionImage({ name, category, ticker });
  return NextResponse.json(
    { url },
    { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
  );
}
