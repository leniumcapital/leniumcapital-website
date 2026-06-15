import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  BillingError,
  completeBillingOrder,
  prismaBillingErrorCode,
} from "@/lib/billing-db";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const result = await completeBillingOrder(session.user.id, id);
    return NextResponse.json({
      ok: true,
      order: result.order,
      tier: result.order.tierSize,
      balance: result.order.balance,
      accountType: "challenge" as const,
      challengeStatus: "in_progress" as const,
      accountNumber: result.order.accountNumber,
    });
  } catch (e) {
    if (e instanceof BillingError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const code = prismaBillingErrorCode(e);
    if (code === "P2021") {
      return NextResponse.json(
        { error: "Billing is not available yet. Please try again shortly." },
        { status: 503 },
      );
    }
    console.error("[billing] complete order failed", e);
    return NextResponse.json({ error: "Could not complete payment." }, { status: 500 });
  }
}
