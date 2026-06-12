import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { executeOrder } from "@/lib/orderEngine";

export const dynamic = "force-dynamic";

/** Place a simulated order at the live Kalshi price. Session required. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { marketTicker?: string; direction?: string; size?: number };
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
    },
    session.user.tier ?? 0,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, fill: result.fill });
}
