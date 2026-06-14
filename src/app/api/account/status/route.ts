import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAccountStatus } from "@/lib/account-status";

export const dynamic = "force-dynamic";

/** Complete account state for the demo/live dashboard switcher. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getAccountStatus(session.user.id);
  return NextResponse.json(status);
}
