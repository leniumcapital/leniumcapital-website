import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { feePctForDaysEarly } from "@/lib/payouts";

export const dynamic = "force-dynamic";

/** Request an early withdrawal with the applicable liquidity fee. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { amount?: number; daysEarly?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const amount = Number(body.amount);
  const daysEarly = Math.max(0, Math.floor(Number(body.daysEarly ?? 0)));
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const feePct = feePctForDaysEarly(daysEarly);
  const fee = Math.round(amount * feePct) / 100;
  const net = Math.round((amount - fee) * 100) / 100;

  return NextResponse.json({
    ok: true,
    amount,
    daysEarly,
    feePct,
    fee,
    net,
    status: "pending",
  });
}
