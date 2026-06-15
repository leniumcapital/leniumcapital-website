import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/** Request a scheduled payout via ACH. Session required. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { amount?: number; minPayoutUsd?: number; accountType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.accountType !== "funded" && session.user.accountType !== "funded") {
    return NextResponse.json(
      { error: "Payouts are only available on funded accounts." },
      { status: 403 },
    );
  }

  const amount = Number(body.amount);
  const minPayout = Number(body.minPayoutUsd ?? 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  if (minPayout > 0 && amount < minPayout) {
    return NextResponse.json(
      {
        error: `Minimum payout is $${minPayout.toLocaleString()}. Your available balance does not meet the threshold.`,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    amount,
    status: "pending",
    processingDays: 7,
  });
}
