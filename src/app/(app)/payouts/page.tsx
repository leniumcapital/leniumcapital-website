import type { Metadata } from "next";
import { auth } from "@/auth";
import { Container, Card } from "@/components/ui";
import { usd, PAYOUT_CYCLE_DAYS, DEFAULT_TRADER_SPLIT_PCT } from "@/lib/data";

export const metadata: Metadata = { title: "Payouts" };

export default async function PayoutsPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) return null;

  const isFunded = user.accountType === "funded";

  return (
    <section className="py-12">
      <Container>
        <h1 className="text-3xl font-semibold tracking-tight">Payouts</h1>
        <p className="mt-2 text-muted">
          {isFunded
            ? `Profits pay out on a ${PAYOUT_CYCLE_DAYS}-day cycle, in USD by ACH.`
            : "Payouts unlock once you pass your challenge and your account is funded."}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <div className="text-sm text-muted">Current balance</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {usd(user.balance)}
            </div>
          </Card>
          <Card>
            <div className="text-sm text-muted">Profit split</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {DEFAULT_TRADER_SPLIT_PCT}%
            </div>
          </Card>
          <Card>
            <div className="text-sm text-muted">Payout cycle</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {PAYOUT_CYCLE_DAYS} days
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <button
            type="button"
            disabled={!isFunded}
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-[#04130b] transition-colors hover:bg-brand-strong disabled:opacity-50"
          >
            {isFunded ? "Request a payout" : "Funded accounts only"}
          </button>
        </div>
      </Container>
    </section>
  );
}
