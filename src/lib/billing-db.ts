import { prisma } from "@/lib/db";
import {
  TIERS,
  computePrice,
  isDeprecatedTierSize,
  isPurchasableTierSize,
  type AddonId,
} from "@/lib/pricing";
import { normalizePurchasedAddons } from "@/lib/addonIds";
import type {
  BillingOrderDto,
  BillingOrderStatus,
  BillingPlanType,
} from "@/lib/billing-types";

export type { BillingOrderDto, BillingOrderStatus, BillingPlanType };

let schemaReady: Promise<void> | null = null;

/** Ensures the BillingOrder table exists (for deploys that skip db push). */
export async function ensureBillingSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "BillingOrder" (
          "id" TEXT NOT NULL,
          "orderNumber" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "accountId" TEXT,
          "planType" TEXT NOT NULL,
          "tierSize" INTEGER NOT NULL,
          "balance" INTEGER NOT NULL,
          "price" INTEGER NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'pending',
          "addons" TEXT NOT NULL DEFAULT '[]',
          "paidAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "BillingOrder_pkey" PRIMARY KEY ("id")
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "BillingOrder_orderNumber_key"
        ON "BillingOrder"("orderNumber")
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "BillingOrder_userId_idx"
        ON "BillingOrder"("userId")
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "BillingOrder_status_idx"
        ON "BillingOrder"("status")
      `);
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

function generateOrderNumber(): string {
  const token = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `LEN-${token}`;
}

export function formatAccountNumber(accountId: string): string {
  return `ACC-${accountId.slice(-8).toUpperCase()}`;
}

function parseAddons(raw: string): AddonId[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AddonId[]) : [];
  } catch {
    return [];
  }
}

function toDto(
  row: {
    id: string;
    orderNumber: string;
    accountId: string | null;
    balance: number;
    price: number;
    status: string;
    planType: string;
    tierSize: number;
    addons: string;
    createdAt: Date;
    paidAt: Date | null;
  },
): BillingOrderDto {
  return {
    id: row.id,
    orderId: row.orderNumber,
    accountNumber: row.accountId ? formatAccountNumber(row.accountId) : null,
    balance: row.balance,
    price: row.price,
    status: row.status as BillingOrderStatus,
    planType: row.planType as BillingPlanType,
    tierSize: row.tierSize,
    addons: parseAddons(row.addons),
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
  };
}

export async function listBillingOrders(userId: string): Promise<BillingOrderDto[]> {
  await ensureBillingSchema();
  const rows = await prisma.billingOrder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDto);
}

export async function createPendingBillingOrder(
  userId: string,
  input: {
    tierSize: number;
    addons?: AddonId[];
    planType?: BillingPlanType;
  },
): Promise<BillingOrderDto> {
  await ensureBillingSchema();

  const tierSize = Number(input.tierSize);
  const planType = input.planType ?? "challenge";

  if (isDeprecatedTierSize(tierSize)) {
    throw new BillingError(
      "That account tier is no longer available. Please choose from our current six options.",
      400,
    );
  }

  if (!isPurchasableTierSize(tierSize)) {
    throw new BillingError("Invalid account tier.", 400);
  }

  const tier = TIERS.find((t) => t.size === tierSize);
  if (!tier) {
    throw new BillingError("Invalid account tier.", 400);
  }

  const addons = Array.isArray(input.addons) ? input.addons : [];
  const price = computePrice(tier, addons);

  const row = await prisma.billingOrder.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId,
      planType,
      tierSize: tier.size,
      balance: tier.size,
      price: price.total,
      status: "pending",
      addons: JSON.stringify(addons),
    },
  });

  return toDto(row);
}

export async function completeBillingOrder(
  userId: string,
  orderId: string,
): Promise<{ order: BillingOrderDto; accountId: string }> {
  await ensureBillingSchema();

  const order = await prisma.billingOrder.findFirst({
    where: {
      userId,
      OR: [{ id: orderId }, { orderNumber: orderId }],
    },
  });

  if (!order) {
    throw new BillingError("Order not found.", 404);
  }

  if (order.status === "paid") {
    return {
      order: toDto(order),
      accountId: order.accountId ?? "",
    };
  }

  const existing = await prisma.tradingAccount.findFirst({
    where: { userId, isPrimary: true },
  });

  if (
    existing &&
    existing.tier > 0 &&
    ["in_progress", "passed", "funded"].includes(existing.challengeStatus)
  ) {
    throw new BillingError("You already have an active challenge.", 400);
  }

  const accountData = {
    accountType: "challenge",
    tier: order.tierSize,
    balance: order.balance,
    challengeStatus: "in_progress",
    isPrimary: true,
    purchasedAddons: normalizePurchasedAddons(parseAddons(order.addons)),
  };

  let accountId: string;

  if (existing) {
    const updated = await prisma.tradingAccount.update({
      where: { id: existing.id },
      data: accountData,
    });
    accountId = updated.id;
  } else {
    const created = await prisma.tradingAccount.create({
      data: { userId, ...accountData },
    });
    accountId = created.id;
  }

  const paid = await prisma.billingOrder.update({
    where: { id: order.id },
    data: {
      status: "paid",
      accountId,
      paidAt: new Date(),
    },
  });

  return { order: toDto(paid), accountId };
}

export async function recordPaidBillingOrder(
  userId: string,
  input: {
    tierSize: number;
    addons?: AddonId[];
    price: number;
    accountId: string;
    planType?: BillingPlanType;
  },
): Promise<BillingOrderDto> {
  await ensureBillingSchema();

  const row = await prisma.billingOrder.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId,
      accountId: input.accountId,
      planType: input.planType ?? "challenge",
      tierSize: input.tierSize,
      balance: input.tierSize,
      price: input.price,
      status: "paid",
      addons: JSON.stringify(input.addons ?? []),
      paidAt: new Date(),
    },
  });

  return toDto(row);
}

export class BillingError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function prismaBillingErrorCode(e: unknown): string | undefined {
  return e && typeof e === "object" && "code" in e
    ? String((e as { code: unknown }).code)
    : undefined;
}
