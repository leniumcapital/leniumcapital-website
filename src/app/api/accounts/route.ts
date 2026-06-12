import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserAccounts } from "@/lib/accounts-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await getUserAccounts(session.user.id);
  const active = accounts.find((a) => a.isPrimary) ?? null;

  return NextResponse.json({
    active,
    accounts,
    hasDemo: accounts.some((a) => a.accountType === "challenge"),
    hasLive: accounts.some((a) => a.accountType === "funded"),
  });
}
