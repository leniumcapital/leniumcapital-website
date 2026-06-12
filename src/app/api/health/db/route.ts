import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Quick check that the app can reach Supabase. Visit /api/health/db to test. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const users = await prisma.user.count();
    return NextResponse.json({ ok: true, users });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown database error";
    console.error("DB health check failed:", e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
