import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveSessionUserId } from "@/lib/auth-db";
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

function prismaCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return undefined;
}

/** Mock checkout — creates a trading account after tier selection. */
export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = await resolveSessionUserId(session);
    if (!userId) {
      return NextResponse.json(
        {
          error:
            "We could not verify your account. Log out, sign in again, then retry.",
          code: "NO_USER_ID",
        },
        { status: 401 },
      );
    }

    const body = (await req.json()) as {
      tierSize?: number;
      addons?: AddonId[];
      demo?: boolean;
    };

    const tierSize = Number(body.tierSize);
    const isDemo = body.demo === true;

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

    if (!isDemo) {
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
    }

    return NextResponse.json({
      ok: true,
      accountId: account.id,
      tier: tier.size,
      balance: tier.size,
      accountType: "challenge" as const,
      challengeStatus: "in_progress" as const,
      totalPaid: isDemo ? 0 : price.total,
    });
  } catch (e) {
    console.error("[purchase] demo account setup failed", e);
    const code = prismaCode(e);
    const message = e instanceof Error ? e.message : "Unknown error";

    if (code === "P2002") {
      return NextResponse.json(
        { error: "You already have an active challenge.", code },
        { status: 400 },
      );
    }

    if (code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Your account record is missing. Log out, sign in again, then retry.",
          code,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Could not start demo account. Please try again.",
        code: code ?? "UNKNOWN",
        detail: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 },
    );
  }
}
