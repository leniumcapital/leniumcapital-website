import { NextResponse } from "next/server";
import { ensureTradingAccountSchema } from "@/lib/accounts-db";
import { prisma } from "@/lib/db";

/** Verify TradingAccount table is reachable (used by demo account setup). */
export async function GET() {
  try {
    await ensureTradingAccountSchema();
    const count = await prisma.tradingAccount.count();
    return NextResponse.json({ ok: true, tradingAccounts: count });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: unknown }).code)
        : undefined;
    console.error("TradingAccount health check failed:", e);
    return NextResponse.json(
      { ok: false, error: message, code },
      { status: 500 },
    );
  }
}
