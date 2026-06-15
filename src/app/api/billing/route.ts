import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  BillingError,
  listBillingOrders,
  prismaBillingErrorCode,
} from "@/lib/billing-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orders = await listBillingOrders(session.user.id);
    return NextResponse.json({ orders });
  } catch (e) {
    if (e instanceof BillingError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const code = prismaBillingErrorCode(e);
    if (code === "P2021") {
      return NextResponse.json({ orders: [] });
    }
    console.error("[billing] list failed", e);
    return NextResponse.json({ error: "Could not load billing history." }, { status: 500 });
  }
}
