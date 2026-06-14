import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeNameKey } from "@/lib/icon-keys";

export const runtime = "nodejs";

/** Increment fail_count for a cached icon; invalidate after 3 failures. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { name_key?: string };
    const rawKey = body.name_key?.trim();
    if (!rawKey) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const nameKey = normalizeNameKey(rawKey);
    if (!nameKey) {
      return NextResponse.json({ success: true });
    }

    const rows = await prisma.iconMapping.findMany({
      where: { nameKey },
    });

    await Promise.all(
      rows.map(async (row) => {
        const failCount = row.failCount + 1;
        await prisma.iconMapping.update({
          where: { id: row.id },
          data: {
            failCount,
            isInvalidated: failCount >= 3,
          },
        });
      }),
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
