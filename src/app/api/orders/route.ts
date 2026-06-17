import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { executeOrder } from "@/lib/orderEngine";
import {
  getTradingAccountForUser,
  listOrdersForAccount,
  persistOpenOrder,
} from "@/lib/orders-db";
import type { OpenPositionSnapshot } from "@/lib/rules";

export const dynamic = "force-dynamic";

/** Open + closed orders for the authenticated user's trading account. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  if (!accountId) {
    return NextResponse.json({ error: "Missing accountId." }, { status: 400 });
  }

  const account = await getTradingAccountForUser(session.user.id, accountId);
  if (!account) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const { open, closed } = await listOrdersForAccount(session.user.id, accountId);

  return NextResponse.json({
    accountId,
    balance: account.balance,
    purchasedAddons: account.purchasedAddons,
    open,
    closed,
  });
}

/** Place a simulated order at the live Kalshi price. Session required. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    accountId?: string;
    marketTicker?: string;
    direction?: string;
    size?: number;
    category?: string;
    marketExpiry?: string;
    openPositions?: OpenPositionSnapshot[];
    currentProfit?: number;
    highWaterMarkUsd?: number;
    staticFloorUsd?: number;
    windowEndDate?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const accountId = String(body.accountId ?? "");
  if (!accountId) {
    return NextResponse.json({ error: "Missing accountId." }, { status: 400 });
  }

  const account = await getTradingAccountForUser(session.user.id, accountId);
  if (!account) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const result = await executeOrder(
    {
      marketTicker: String(body.marketTicker ?? ""),
      direction: body.direction as "yes" | "no",
      size: Number(body.size),
      marketExpiry: body.marketExpiry,
      openPositions: body.openPositions,
      currentProfit: Number(body.currentProfit ?? 0),
      highWaterMarkUsd: Number(body.highWaterMarkUsd ?? 0),
      staticFloorUsd: Number(body.staticFloorUsd ?? 0),
      windowEndDate: body.windowEndDate,
    },
    account,
    body.openPositions ?? [],
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    const { balance } = await persistOpenOrder({
      userId: session.user.id,
      accountId: account.id,
      positionId: result.fill.positionId,
      marketTicker: result.fill.marketTicker,
      question: result.fill.question,
      category: body.category,
      direction: result.fill.direction,
      size: result.fill.size,
      entryPrice: result.fill.entryPrice,
      openedAt: result.fill.openedAt,
      debitAmount: result.fill.size + result.fill.commission,
    });

    return NextResponse.json({
      ok: true,
      fill: { ...result.fill, balance },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not persist order.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
