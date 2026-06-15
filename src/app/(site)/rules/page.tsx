import type { Metadata } from "next";
import { Container, Card } from "@/components/ui";
import { RulesExplorer } from "@/components/RulesExplorer";
import { RULE_ROWS, PLATFORM_RULES } from "@/lib/data";

export const metadata: Metadata = {
  title: "Rules",
  description:
    "The complete Lenium evaluation and funded account rules — six tiers, flat 20% profit target, 10% static drawdown, no daily loss limit.",
};

export default function RulesPage() {
  return (
    <>
      <section className="border-b border-border py-14">
        <Container>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Rules built for prediction markets
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Not copied from forex prop firms. Every limit is calibrated to binary
            contracts on Kalshi — transparent, uniform across all six tiers, and
            designed for skilled forecasters.
          </p>
        </Container>
      </section>

      <section className="py-14">
        <Container>
          <h2 className="text-2xl font-semibold tracking-tight">
            Select your account size
          </h2>
          <p className="mt-2 text-muted">
            Dollar limits scale with your tier. Percentage rules are identical on
            every account.
          </p>
          <div className="mt-6">
            <RulesExplorer />
          </div>
        </Container>
      </section>

      <section className="border-y border-border bg-surface py-14">
        <Container>
          <h2 className="text-3xl font-semibold tracking-tight">
            Evaluation rules
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            A flat 20% profit target and 10% static drawdown on every tier. No
            daily loss limit. No minimum trading days.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RULE_ROWS.map((r, i) => (
              <Card key={r.label} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft font-mono text-sm font-semibold text-brand-strong">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{r.label}</h3>
                  <p className="mt-1.5 text-sm text-muted">{r.plain}</p>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {PLATFORM_RULES.map((r) => (
              <Card key={r.label} className="p-5">
                <h3 className="font-semibold">{r.label}</h3>
                <p className="mt-1.5 text-sm text-muted">{r.plain}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
