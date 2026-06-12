import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Quick check that the app can reach Supabase. Visit /api/health/db to test. */
export async function GET() {
  const authSecretSet = Boolean(process.env.AUTH_SECRET);
  const hasDbUrl = Boolean(
    process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL,
  );

  try {
    await prisma.$queryRaw`SELECT 1`;
    const users = await prisma.user.count();
    return NextResponse.json({
      ok: true,
      users,
      authSecretSet,
      hasDbUrl,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown database error";
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: unknown }).code)
        : undefined;
    console.error("DB health check failed:", e);
    return NextResponse.json(
      { ok: false, error: message, code, authSecretSet, hasDbUrl },
      { status: 500 },
    );
  }
}
