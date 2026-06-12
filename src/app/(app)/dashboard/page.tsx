import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { Container, Card } from "@/components/ui";
import { usd, fundedTargetUsd, demoTargetUsd, TIERS } from "@/lib/data";
import { challengeStatusLabel } from "@/lib/users";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) return null; // middleware guarantees a session; satisfies types

  const tier = TIERS.find((t) => t.size === user.tier);
  const isFunded = user.accountType === "funded";

  return (
    <section className="py-12">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Welcome back</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {user.name}
            </h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-soft px-3 py-1 text-sm font-medium text-brand-strong">
            <span className="size-1.5 rounded-full bg-brand" />
            {challengeStatusLabel(user.challengeStatus)}
          </span>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Account balance" value={usd(user.balance)} />
          <Stat label="Account size" value={usd(user.tier)} />
          <Stat
            label="Account type"
            value={isFunded ? "Funded" : "Challenge"}
          />
          <Stat
            label={isFunded ? "Monthly target" : "Profit target"}
            value={
              tier
                ? isFunded
                  ? `${usd(fundedTargetUsd(tier))}/mo`
                  : usd(demoTargetUsd(tier))
                : "—"
            }
          />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <NavCard
            href="/platform"
            title="Trading platform"
            body="Trade live Kalshi markets on your account."
          />
          <NavCard
            href="/payouts"
            title="Payouts"
            body="Track your balance and request withdrawals."
          />
          <NavCard
            href="/account"
            title="Account"
            body="Manage your profile and account settings."
          />
        </div>
      </Container>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
    </Card>
  );
}

function NavCard({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-brand/50"
    >
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </Link>
  );
}
