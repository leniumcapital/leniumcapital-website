import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prefetchOutcomesBatch } from "@/lib/icon-resolvers";
import { prisma } from "@/lib/db";
import { normalizeNameKey } from "@/lib/icon-keys";

export const runtime = "nodejs";
export const maxDuration = 60;

type PrefetchBody = {
  outcomes?: { name: string; category: string }[];
};

/** Queue background icon resolution for outcomes missing from cache. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PrefetchBody;
  try {
    body = (await req.json()) as PrefetchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const outcomes = body.outcomes ?? [];
  const toResolve: { name: string; category: string }[] = [];

  for (const o of outcomes) {
    const name = o.name?.trim();
    const category = o.category?.trim() || "Other";
    if (!name) continue;
    const nameKey = normalizeNameKey(name);
    if (!nameKey) continue;

    const existing = await prisma.iconMapping.findUnique({
      where: { nameKey_category: { nameKey, category } },
    });
    if (existing && !existing.isInvalidated) continue;
    toResolve.push({ name, category });
  }

  const queued = toResolve.length;

  if (queued > 0) {
    void prefetchOutcomesBatch(toResolve, 5);
  }

  return NextResponse.json({ queued });
}
