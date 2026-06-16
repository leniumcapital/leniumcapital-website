import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { executeOrder } from "@/lib/orderEngine";
import type { AddonId } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Place a simulated order at the live Kalshi price. Session required. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    marketTicker?: string;
    direction?: string;
    size?: number;
    marketExpiry?: string;
    openPositions?: Array<{
      marketTicker: string;
      size: number;
      entryPrice: number;
      direction: "yes" | "no";
      currentPrice: number;
    }>;
    currentProfit?: number;
    highWaterMarkUsd?: number;
    staticFloorUsd?: number;
    windowEndDate?: string;
    addons?: AddonId[];
    accountType?: string;
    challengeStatus?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
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
      addons: body.addons,
      accountType: body.accountType ?? session.user.accountType,
      challengeStatus: body.challengeStatus ?? session.user.challengeStatus,
    },
    session.user.tier ?? 0,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Persist simulated fills when the user has a trading account (best-effort).
  if (session.user.id) {
    try {
      const account = await prisma.tradingAccount.findFirst({
        where: { userId: session.user.id, isPrimary: true },
      });
      if (account) {
        await prisma.order.create({
          data: {
            id: result.fill.positionId,
            userId: session.user.id,
            accountId: account.id,
            marketTicker: result.fill.marketTicker,
            question: result.fill.question,
            direction: result.fill.direction,
            size: result.fill.size,
            entryPrice: result.fill.entryPrice,
            simulated: true,
            status: "open",
          },
        });
      }
    } catch (e) {
      console.warn("[orders] persistence skipped:", e);
    }
  }

  return NextResponse.json({ ok: true, fill: result.fill });
}
