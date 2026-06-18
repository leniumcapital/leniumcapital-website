import { prisma } from "@/lib/db";
import type { AccountType, ChallengeStatus } from "@/lib/users";

let tradingAccountSchemaReady: Promise<void> | null = null;

/** Ensures TradingAccount exists — for deploys where db push was skipped. */
export async function ensureTradingAccountSchema(): Promise<void> {
  if (!tradingAccountSchemaReady) {
    tradingAccountSchemaReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "TradingAccount" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "accountType" TEXT NOT NULL,
          "tier" INTEGER NOT NULL,
          "balance" INTEGER NOT NULL,
          "challengeStatus" TEXT NOT NULL,
          "isPrimary" BOOLEAN NOT NULL DEFAULT true,
          "purchasedAddons" TEXT[] DEFAULT ARRAY[]::TEXT[],
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "TradingAccount_pkey" PRIMARY KEY ("id")
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "TradingAccount_userId_accountType_key"
        ON "TradingAccount"("userId", "accountType")
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "TradingAccount_userId_idx"
        ON "TradingAccount"("userId")
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "TradingAccount"
        ADD COLUMN IF NOT EXISTS "purchasedAddons" TEXT[] DEFAULT ARRAY[]::TEXT[]
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "TradingAccount"
        ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN DEFAULT true
      `);
    })().catch((e) => {
      tradingAccountSchemaReady = null;
      throw e;
    });
  }
  return tradingAccountSchemaReady;
}

export type TradingAccountSummary = {
  id: string;
  accountType: AccountType;
  tier: number;
  balance: number;
  challengeStatus: ChallengeStatus;
  isPrimary: boolean;
};

export async function getUserAccounts(
  userId: string,
): Promise<TradingAccountSummary[]> {
  const accounts = await prisma.tradingAccount.findMany({
    where: { userId },
    orderBy: { accountType: "asc" },
  });
  return accounts.map((a) => ({
    id: a.id,
    accountType: a.accountType as AccountType,
    tier: a.tier,
    balance: a.balance,
    challengeStatus: a.challengeStatus as ChallengeStatus,
    isPrimary: a.isPrimary,
  }));
}

export async function getActiveAccount(userId: string) {
  return prisma.tradingAccount.findFirst({
    where: { userId, isPrimary: true },
  });
}

export type SwitchAccountResult =
  | { ok: true; account: TradingAccountSummary }
  | { ok: false; error: string };

/** Switch the active trading account between demo (challenge) and live (funded). */
export async function switchActiveAccount(
  userId: string,
  targetType: AccountType,
): Promise<SwitchAccountResult> {
  const target = await prisma.tradingAccount.findFirst({
    where: { userId, accountType: targetType },
  });

  if (!target) {
    const label = targetType === "challenge" ? "demo" : "live funded";
    return {
      ok: false,
      error: `You don't have a ${label} account yet.`,
    };
  }

  if (target.isPrimary) {
    return {
      ok: true,
      account: {
        id: target.id,
        accountType: target.accountType as AccountType,
        tier: target.tier,
        balance: target.balance,
        challengeStatus: target.challengeStatus as ChallengeStatus,
        isPrimary: true,
      },
    };
  }

  await prisma.$transaction([
    prisma.tradingAccount.updateMany({
      where: { userId },
      data: { isPrimary: false },
    }),
    prisma.tradingAccount.update({
      where: { id: target.id },
      data: { isPrimary: true },
    }),
  ]);

  return {
    ok: true,
    account: {
      id: target.id,
      accountType: target.accountType as AccountType,
      tier: target.tier,
      balance: target.balance,
      challengeStatus: target.challengeStatus as ChallengeStatus,
      isPrimary: true,
    },
  };
}

/** Create or update a trading account without disturbing the other account type. */
export async function upsertTradingAccount(
  userId: string,
  data: {
    accountType: AccountType;
    tier: number;
    balance: number;
    challengeStatus: ChallengeStatus;
    makePrimary?: boolean;
  },
) {
  await ensureTradingAccountSchema();

  const existing = await prisma.tradingAccount.findFirst({
    where: { userId, accountType: data.accountType },
  });

  if (existing) {
    if (data.makePrimary) {
      await prisma.tradingAccount.updateMany({
        where: { userId },
        data: { isPrimary: false },
      });
    }
    return prisma.tradingAccount.update({
      where: { id: existing.id },
      data: {
        tier: data.tier,
        balance: data.balance,
        challengeStatus: data.challengeStatus,
        ...(data.makePrimary ? { isPrimary: true } : {}),
      },
    });
  }

  const hasAny = await prisma.tradingAccount.count({ where: { userId } });
  const makePrimary = data.makePrimary ?? hasAny === 0;

  if (makePrimary) {
    await prisma.tradingAccount.updateMany({
      where: { userId },
      data: { isPrimary: false },
    });
  }

  return prisma.tradingAccount.create({
    data: {
      userId,
      accountType: data.accountType,
      tier: data.tier,
      balance: data.balance,
      challengeStatus: data.challengeStatus,
      isPrimary: makePrimary,
    },
  });
}
