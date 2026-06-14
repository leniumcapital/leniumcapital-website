import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { normalizeNameKey } from "@/lib/icon-keys";

export const runtime = "nodejs";

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/** Admin maintenance for the icon_mappings cache. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "list") {
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      prisma.iconMapping.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.iconMapping.count(),
    ]);

    return NextResponse.json({ rows, total, page, limit });
  }

  if (action === "invalidate-all-category") {
    const category = searchParams.get("category")?.trim();
    if (!category) {
      return NextResponse.json({ error: "category required" }, { status: 400 });
    }
    const result = await prisma.iconMapping.updateMany({
      where: { category },
      data: { isInvalidated: true },
    });
    return NextResponse.json({ success: true, count: result.count });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  if (searchParams.get("action") !== "add") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  let body: { name?: string; category?: string; image_url?: string; source?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const category = body.category?.trim() || "Other";
  const imageUrl = body.image_url?.trim();
  const source = body.source?.trim() || "manual";

  if (!name || !imageUrl) {
    return NextResponse.json({ error: "name and image_url required" }, { status: 400 });
  }

  const nameKey = normalizeNameKey(name);
  if (!nameKey) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const row = await prisma.iconMapping.upsert({
    where: { nameKey_category: { nameKey, category } },
    create: {
      nameKey,
      displayName: name,
      imageUrl,
      category,
      source,
      isVerified: true,
      isInvalidated: false,
      failCount: 0,
    },
    update: {
      displayName: name,
      imageUrl,
      source,
      isVerified: true,
      isInvalidated: false,
      failCount: 0,
    },
  });

  return NextResponse.json({ success: true, row });
}
