import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { executeClose } from "@/lib/orderEngine";
import { persistCloseOrder } from "@/lib/orders-db";

export const dynamic = "force-dynamic";

/** Close a position at the live Kalshi price. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    accountId?: string;
    positionId?: string;
    marketTicker?: string;
    direction?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const accountId = String(body.accountId ?? "");
  const marketTicker = String(body.marketTicker ?? "");
  const direction = body.direction === "no" ? "no" : "yes";
  const positionId = String(body.positionId ?? "");

  if (!accountId || !marketTicker || !positionId) {
    return NextResponse.json(
      { error: "Missing accountId, positionId, or marketTicker." },
      { status: 400 },
    );
  }

  const result = await executeClose(marketTicker, direction);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    const closed = await persistCloseOrder({
      userId: session.user.id,
      accountId,
      positionId,
      exitPrice: result.exitPrice,
    });

    return NextResponse.json({
      ok: true,
      exitPrice: result.exitPrice,
      balance: closed.balance,
      pnl: closed.pnl,
      simulated: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not close position.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
