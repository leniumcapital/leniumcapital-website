import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { TIERS, computePrice, type AddonId } from "@/lib/data";

/** Mock checkout — creates a trading account after tier selection. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    tierSize?: number;
    addons?: AddonId[];
  };

  const tierSize = Number(body.tierSize);
  const tier = TIERS.find((t) => t.size === tierSize);
  if (!tier) {
    return NextResponse.json({ error: "Invalid account tier." }, { status: 400 });
  }

  const addons = Array.isArray(body.addons) ? body.addons : [];
  const price = computePrice(tier, addons);

  const existing = await prisma.tradingAccount.findFirst({
    where: { userId: session.user.id, isPrimary: true },
  });

  if (
    existing &&
    existing.tier > 0 &&
    ["in_progress", "passed", "funded"].includes(existing.challengeStatus)
  ) {
    return NextResponse.json(
      { error: "You already have an active challenge." },
      { status: 400 },
    );
  }

  const accountData = {
    accountType: "challenge",
    tier: tier.size,
    balance: tier.size,
    challengeStatus: "in_progress",
    isPrimary: true,
  };

  if (existing) {
    await prisma.tradingAccount.update({
      where: { id: existing.id },
      data: accountData,
    });
  } else {
    await prisma.tradingAccount.create({
      data: { userId: session.user.id, ...accountData },
    });
  }

  return NextResponse.json({
    ok: true,
    tier: tier.size,
    balance: tier.size,
    accountType: "challenge" as const,
    challengeStatus: "in_progress" as const,
    totalPaid: price.total,
  });
}
