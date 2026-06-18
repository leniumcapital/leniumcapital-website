import { NextResponse } from "next/server";
import { getAuthPrisma, prisma } from "@/lib/db";

async function probe(label: string, client: typeof prisma) {
  try {
    await client.$queryRaw`SELECT 1`;
    const users = await client.user.count();
    return { ok: true as const, label, users };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown database error";
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: unknown }).code)
        : undefined;
    console.error(`Auth DB health (${label}) failed:`, e);
    return { ok: false as const, label, error: message, code };
  }
}

/** Compare pooled vs direct Postgres — Google OAuth uses the pooled client for upserts. */
export async function GET() {
  const [pooled, direct] = await Promise.all([
    probe("pooled", prisma),
    probe("direct", getAuthPrisma()),
  ]);

  return NextResponse.json({
    ok: pooled.ok,
    googleSignInUses: "pooled",
    pooled,
    direct,
  });
}
