import type { Metadata } from "next";
import { Container, Card, PillBadge } from "@/components/ui";
import { RulesExplorer } from "@/components/RulesExplorer";
import { RULE_ROWS, PREDICTION_RULES } from "@/lib/data";

export const metadata: Metadata = {
  title: "Rules",
  description:
    "The complete challenge rules for all nine tiers, calibrated for binary prediction market contract mechanics.",
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
            Not copied from forex prop firms. Every limit is calibrated to the
            mechanics of binary contracts that resolve to $1 or $0.
          </p>
        </Container>
      </section>

      {/* Tier-filtered table */}
      <section className="py-14">
        <Container>
          <h2 className="text-2xl font-semibold tracking-tight">
            Select your account size
          </h2>
          <p className="mt-2 text-muted">
            Every limit below updates to your chosen tier.
          </p>
          <div className="mt-6">
            <RulesExplorer />
          </div>
        </Container>
      </section>

      {/* Plain-English explanations */}
      <section className="border-y border-border bg-surface py-14">
        <Container>
          <h2 className="text-2xl font-semibold tracking-tight">
            Every rule, in plain English
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {RULE_ROWS.map((r) => (
              <Card key={r.key as string}>
                <h3 className="font-semibold">{r.label}</h3>
                <p className="mt-2 text-sm text-muted">{r.plain}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Prediction-market-specific rules */}
      <section className="py-14">
        <Container>
          <PillBadge tone="brand">Found nowhere else in the industry</PillBadge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Four rules unique to Lenium
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            These exist because binary contracts resolve instantaneously — there
            is no stop-loss after an event fires. They filter genuine forecasting
            from last-second gambling.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {PREDICTION_RULES.map((r, i) => (
              <Card key={r.title} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft font-mono text-sm font-semibold text-brand-strong">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="mt-1.5 text-sm text-muted">{r.body}</p>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
