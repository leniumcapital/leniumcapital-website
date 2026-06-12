import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { PricingCalculator } from "@/components/PricingCalculator";
import { TIERS, usd, resetLineShort } from "@/lib/data";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Nine evaluation tiers from $5,000 to $100,000. Choose a size, pay a one-time fee, hit your profit goal, and get funded.",
};

const STEPS = [
  {
    n: "1",
    title: "Pick an account size",
    body: "Choose how much capital you want to trade with, from $5,000 up to $100,000.",
  },
  {
    n: "2",
    title: "Pay a one-time fee",
    body: "A single upfront fee for that account. No subscriptions, no hidden charges.",
  },
  {
    n: "3",
    title: "Hit your profit goal",
    body: "Reach the profit goal without crossing the safety limit, then trade our money and keep the profits.",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-border py-14">
        <Container>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Build your challenge
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Nine account sizes, five add-ons, and a live total. Pick a size, pay
            once, and see exactly what it takes to get funded.
          </p>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <PricingCalculator />
        </Container>
      </section>

      {/* Plain-English account chart */}
      <section className="border-y border-border bg-surface py-14">
        <Container>
          <h2 className="text-3xl font-semibold tracking-tight">
            Every account, explained simply
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Three steps. Choose a size, pay a one-time fee, and earn your profit
            goal without crossing the safety limit. That&apos;s it.
          </p>

          {/* How it works, 3 steps */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-border bg-background p-5"
              >
                <div className="grid size-8 place-items-center rounded-full bg-brand text-sm font-bold text-[#04130b]">
                  {s.n}
                </div>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </div>
            ))}
          </div>

          {/* The chart */}
          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-background">
            {/* Column headers — desktop only */}
            <div className="hidden bg-surface-muted px-5 py-3 md:grid md:grid-cols-4 md:gap-4">
              <ColHead title="Account size" hint="What you trade with" />
              <ColHead title="One-time fee" hint="What you pay" />
              <ColHead title="Profit goal" hint="Earn this to get funded" />
              <ColHead title="Safety limit" hint="Don't lose more than this" />
            </div>

            <div className="divide-y divide-border">
              {TIERS.map((t) => {
                const goal = Math.round((t.size * t.profitTargetPct) / 100);
                const loss = Math.round((t.size * t.maxDrawdownPct) / 100);
                return (
                  <div
                    key={t.size}
                    className="grid grid-cols-2 gap-4 px-5 py-4 md:grid-cols-4 md:items-center"
                  >
                    <Field label="Account size">
                      <span className="inline-flex rounded-lg bg-brand-soft px-2.5 py-1 text-base font-semibold text-foreground">
                        {usd(t.size)}
                      </span>
                    </Field>

                    <Field label="One-time fee">
                      <div className="text-base font-semibold">${t.baseFee}</div>
                      <div className="text-xs text-muted">paid once</div>
                      <div className="mt-1 text-xs text-muted">
                        {resetLineShort(t)}
                      </div>
                    </Field>

                    <Field label="Profit goal">
                      <div className="text-base font-semibold text-brand-strong">
                        ${goal.toLocaleString()}
                      </div>
                    </Field>

                    <Field label="Safety limit">
                      <div className="text-base font-semibold">
                        ${loss.toLocaleString()}
                      </div>
                    </Field>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-4 text-sm text-muted">
            <span className="font-medium text-foreground">In plain words:</span>{" "}
            reach the green <span className="text-brand-strong">profit goal</span>{" "}
            to get funded, and never let your losses pass the{" "}
            <span className="text-foreground">safety limit</span> to keep your
            account.
          </p>
        </Container>
      </section>
    </>
  );
}

function ColHead({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted">{hint}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted md:hidden">
        {label}
      </div>
      <div className="mt-1 md:mt-0">{children}</div>
    </div>
  );
}
