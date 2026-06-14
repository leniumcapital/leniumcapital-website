import "server-only";

import { prisma } from "@/lib/db";

export type TradingMode = "demo" | "live";

export type AccountStatusPayload = {
  tradingMode: TradingMode;
  hasActiveChallenge: boolean;
  hasFundedAccount: boolean;
  challengeBalance: number;
  fundedBalance: number;
  challengeAccountId: string | null;
  fundedAccountId: string | null;
  challengeTier: number;
  fundedTier: number;
};

const ACTIVE_CHALLENGE_STATUSES = new Set(["in_progress", "passed"]);

/** Load demo/live account state for the dashboard switcher. */
export async function getAccountStatus(
  userId: string,
): Promise<AccountStatusPayload> {
  const accounts = await prisma.tradingAccount.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  const challengeAccount = accounts.find(
    (a) =>
      a.accountType === "challenge" &&
      a.tier > 0 &&
      ACTIVE_CHALLENGE_STATUSES.has(a.challengeStatus),
  );

  const fundedAccount = accounts.find(
    (a) => a.accountType === "funded" && a.challengeStatus === "funded",
  );

  const hasActiveChallenge = Boolean(challengeAccount);
  const hasFundedAccount = Boolean(fundedAccount);

  const tradingMode: TradingMode = hasFundedAccount ? "live" : "demo";

  return {
    tradingMode,
    hasActiveChallenge,
    hasFundedAccount,
    challengeBalance: challengeAccount?.balance ?? 0,
    fundedBalance: fundedAccount?.balance ?? 0,
    challengeAccountId: challengeAccount?.id ?? null,
    fundedAccountId: fundedAccount?.id ?? null,
    challengeTier: challengeAccount?.tier ?? 0,
    fundedTier: fundedAccount?.tier ?? 0,
  };
}
