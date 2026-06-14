import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { executeOrder } from "@/lib/orderEngine";

export const dynamic = "force-dynamic";

/** Place an order at the live Kalshi price. Simulated orders stay in Lenium DB only. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    marketTicker?: string;
    direction?: string;
    size?: number;
    simulated?: boolean;
    accountId?: string;
    question?: string;
    category?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const simulated = body.simulated !== false;
  const accountId = String(body.accountId ?? "");

  const account = await prisma.tradingAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
  });

  if (!account) {
    return NextResponse.json({ error: "Invalid trading account." }, { status: 400 });
  }

  if (!simulated && account.accountType !== "funded") {
    return NextResponse.json(
      { error: "Live orders require a funded account." },
      { status: 400 },
    );
  }

  const result = await executeOrder(
    {
      marketTicker: String(body.marketTicker ?? ""),
      direction: body.direction as "yes" | "no",
      size: Number(body.size),
    },
    account.tier,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      accountId: account.id,
      marketTicker: result.fill.marketTicker,
      question: body.question ?? result.fill.question,
      category: body.category ?? null,
      direction: result.fill.direction,
      size: result.fill.size,
      entryPrice: result.fill.entryPrice,
      simulated,
      status: "open",
      openedAt: new Date(result.fill.openedAt),
    },
  });

  return NextResponse.json({
    ok: true,
    fill: {
      ...result.fill,
      positionId: order.id,
      simulated,
    },
  });
}
