import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { executeClose } from "@/lib/orderEngine";

export const dynamic = "force-dynamic";

/** Close a position at the live Kalshi price. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { positionId?: string; marketTicker?: string; direction?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const marketTicker = String(body.marketTicker ?? "");
  const direction = body.direction === "no" ? "no" : "yes";
  const positionId = String(body.positionId ?? "");

  if (!marketTicker || !positionId) {
    return NextResponse.json(
      { error: "Missing positionId or marketTicker" },
      { status: 400 },
    );
  }

  const order = await prisma.order.findFirst({
    where: {
      id: positionId,
      userId: session.user.id,
      status: "open",
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Position not found." }, { status: 404 });
  }

  const result = await executeClose(marketTicker, direction);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "closed",
      exitPrice: result.exitPrice,
      closedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    exitPrice: result.exitPrice,
    simulated: order.simulated,
  });
}
