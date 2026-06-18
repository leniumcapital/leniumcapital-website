import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertTradingAccount } from "@/lib/accounts-db";
import { prisma } from "@/lib/db";
import {
  TIERS,
  computePrice,
  isDeprecatedTierSize,
  isPurchasableTierSize,
  type AddonId,
} from "@/lib/pricing";
import {
  BillingError,
  recordPaidBillingOrder,
  prismaBillingErrorCode,
} from "@/lib/billing-db";

const DEPRECATED_TIER_MESSAGE =
  "That account tier is no longer available. Please choose from our current six options: $5,000, $10,000, $25,000, $50,000, $75,000, or $100,000.";

const ACTIVE_CHALLENGE_STATUSES = new Set(["in_progress", "passed", "funded"]);

/** Mock checkout — creates a trading account after tier selection. */
export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id?.trim();
    if (!userId) {
      return NextResponse.json(
        { error: "Your session expired. Log out and sign in again." },
        { status: 401 },
      );
    }

    const body = (await req.json()) as {
      tierSize?: number;
      addons?: AddonId[];
    };

    const tierSize = Number(body.tierSize);

    if (isDeprecatedTierSize(tierSize)) {
      return NextResponse.json({ error: DEPRECATED_TIER_MESSAGE }, { status: 400 });
    }

    if (!isPurchasableTierSize(tierSize)) {
      return NextResponse.json({ error: "Invalid account tier." }, { status: 400 });
    }

    const tier = TIERS.find((t) => t.size === tierSize);
    if (!tier) {
      return NextResponse.json({ error: "Invalid account tier." }, { status: 400 });
    }

    const addons = Array.isArray(body.addons) ? body.addons : [];
    const price = computePrice(tier, addons);

    const challengeAccount = await prisma.tradingAccount.findUnique({
      where: {
        userId_accountType: { userId, accountType: "challenge" },
      },
    });

    if (
      challengeAccount &&
      challengeAccount.tier > 0 &&
      ACTIVE_CHALLENGE_STATUSES.has(challengeAccount.challengeStatus)
    ) {
      return NextResponse.json(
        { error: "You already have an active challenge." },
        { status: 400 },
      );
    }

    const account = await upsertTradingAccount(userId, {
      accountType: "challenge",
      tier: tier.size,
      balance: tier.size,
      challengeStatus: "in_progress",
      makePrimary: true,
    });

    try {
      await recordPaidBillingOrder(userId, {
        tierSize: tier.size,
        addons,
        price: price.total,
        accountId: account.id,
        planType: "challenge",
      });
    } catch (e) {
      const code = prismaBillingErrorCode(e);
      if (!(e instanceof BillingError) && code !== "P2021") {
        console.error("[purchase] billing record failed", e);
      }
    }

    return NextResponse.json({
      ok: true,
      tier: tier.size,
      balance: tier.size,
      accountType: "challenge" as const,
      challengeStatus: "in_progress" as const,
      totalPaid: price.total,
    });
  } catch (e) {
    console.error("[purchase] demo account setup failed", e);
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: unknown }).code)
        : undefined;

    if (code === "P2002") {
      return NextResponse.json(
        { error: "You already have an active challenge." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Could not start demo account. Please try again." },
      { status: 500 },
    );
  }
}
