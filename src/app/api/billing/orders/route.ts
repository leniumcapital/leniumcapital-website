import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  BillingError,
  createPendingBillingOrder,
  prismaBillingErrorCode,
} from "@/lib/billing-db";
import type { AddonId } from "@/lib/pricing";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    tierSize?: number;
    addons?: AddonId[];
    planType?: "challenge" | "reset";
  };

  try {
    const order = await createPendingBillingOrder(session.user.id, {
      tierSize: Number(body.tierSize),
      addons: body.addons,
      planType: body.planType,
    });
    return NextResponse.json({ order });
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
    console.error("[billing] create order failed", e);
    return NextResponse.json({ error: "Could not create order." }, { status: 500 });
  }
}
