import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { executeClose } from "@/lib/orderEngine";

export const dynamic = "force-dynamic";

/** Close a simulated position at the live Kalshi price. Session required. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
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
  if (!marketTicker || !body.positionId) {
    return NextResponse.json(
      { error: "Missing positionId or marketTicker" },
      { status: 400 },
    );
  }

  const result = await executeClose(marketTicker, direction);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, exitPrice: result.exitPrice });
}
