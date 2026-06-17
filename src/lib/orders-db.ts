import "server-only";

import { prisma } from "@/lib/db";
import { normalizePurchasedAddons } from "@/lib/addonIds";
import type { AddonId } from "@/lib/pricing";

export type TradingAccountRecord = {
  id: string;
  userId: string;
  accountType: string;
  tier: number;
  balance: number;
  challengeStatus: string;
  purchasedAddons: AddonId[];
};

export async function getTradingAccountForUser(
  userId: string,
  accountId: string,
): Promise<TradingAccountRecord | null> {
  const row = await prisma.tradingAccount.findFirst({
    where: { id: accountId, userId },
  });
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    accountType: row.accountType,
    tier: row.tier,
    balance: row.balance,
    challengeStatus: row.challengeStatus,
    purchasedAddons: normalizePurchasedAddons(row.purchasedAddons),
  };
}

export type DbOpenOrder = {
  id: string;
  marketTicker: string;
  question: string | null;
  category: string | null;
  direction: "yes" | "no";
  size: number;
  entryPrice: number;
  openedAt: number;
};

export type DbClosedOrder = DbOpenOrder & {
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  closedAt: number;
};

function computePnl(
  direction: "yes" | "no",
  size: number,
  entryPrice: number,
  exitPrice: number,
): number {
  if (entryPrice <= 0) return 0;
  const contracts = size / entryPrice;
  return contracts * (exitPrice - entryPrice);
}

export async function listOrdersForAccount(
  userId: string,
  accountId: string,
): Promise<{ open: DbOpenOrder[]; closed: DbClosedOrder[] }> {
  const rows = await prisma.order.findMany({
    where: { userId, accountId },
    orderBy: { openedAt: "desc" },
  });

  const open: DbOpenOrder[] = [];
  const closed: DbClosedOrder[] = [];

  for (const row of rows) {
    const base = {
      id: row.id,
      marketTicker: row.marketTicker,
      question: row.question,
      category: row.category,
      direction: row.direction === "no" ? ("no" as const) : ("yes" as const),
      size: row.size,
      entryPrice: row.entryPrice,
      openedAt: row.openedAt.getTime(),
    };
    if (row.status === "open") {
      open.push(base);
    } else if (row.exitPrice != null && row.closedAt) {
      const pnl = computePnl(base.direction, base.size, base.entryPrice, row.exitPrice);
      closed.push({
        ...base,
        exitPrice: row.exitPrice,
        pnl,
        pnlPercent: base.size > 0 ? (pnl / base.size) * 100 : 0,
        closedAt: row.closedAt.getTime(),
      });
    }
  }

  return { open, closed };
}

export async function persistOpenOrder(params: {
  userId: string;
  accountId: string;
  positionId: string;
  marketTicker: string;
  question: string;
  category?: string;
  direction: "yes" | "no";
  size: number;
  entryPrice: number;
  openedAt: number;
  debitAmount: number;
}): Promise<{ balance: number }> {
  return prisma.$transaction(async (tx) => {
    const account = await tx.tradingAccount.findFirst({
      where: { id: params.accountId, userId: params.userId },
    });
    if (!account) throw new Error("Account not found.");

    if (params.debitAmount > account.balance) {
      throw new Error("Insufficient balance for this order.");
    }

    await tx.order.create({
      data: {
        id: params.positionId,
        userId: params.userId,
        accountId: params.accountId,
        marketTicker: params.marketTicker,
        question: params.question,
        category: params.category,
        direction: params.direction,
        size: params.size,
        entryPrice: params.entryPrice,
        simulated: true,
        status: "open",
        openedAt: new Date(params.openedAt),
      },
    });

    const updated = await tx.tradingAccount.update({
      where: { id: account.id },
      data: { balance: account.balance - params.debitAmount },
    });

    return { balance: updated.balance };
  });
}

export async function persistCloseOrder(params: {
  userId: string;
  accountId: string;
  positionId: string;
  exitPrice: number;
}): Promise<{ balance: number; pnl: number; size: number }> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: params.positionId,
        userId: params.userId,
        accountId: params.accountId,
        status: "open",
      },
    });
    if (!order) throw new Error("Position not found.");

    const direction = order.direction === "no" ? "no" : "yes";
    const pnl = computePnl(direction, order.size, order.entryPrice, params.exitPrice);
    const credit = order.size + pnl;

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "closed",
        exitPrice: params.exitPrice,
        closedAt: new Date(),
      },
    });

    const account = await tx.tradingAccount.findFirst({
      where: { id: params.accountId, userId: params.userId },
    });
    if (!account) throw new Error("Account not found.");

    const updated = await tx.tradingAccount.update({
      where: { id: account.id },
      data: { balance: Math.max(0, account.balance + credit) },
    });

    return { balance: updated.balance, pnl, size: order.size };
  });
}
