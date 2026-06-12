import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { switchActiveAccount } from "@/lib/accounts-db";
import type { AccountType } from "@/lib/users";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { accountType?: string };
  const accountType = body.accountType;

  if (accountType !== "challenge" && accountType !== "funded") {
    return NextResponse.json(
      { error: "accountType must be challenge or funded." },
      { status: 400 },
    );
  }

  const result = await switchActiveAccount(
    session.user.id,
    accountType as AccountType,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { account } = result;

  return NextResponse.json({
    ok: true,
    account: {
      accountType: account.accountType,
      tier: account.tier,
      balance: account.balance,
      challengeStatus: account.challengeStatus,
    },
  });
}
