import type { Metadata } from "next";
import { Container, Card } from "@/components/ui";
import { RulesExplorer } from "@/components/RulesExplorer";
import { RULE_ROWS, TIERS, type Tier } from "@/lib/data";

export const metadata: Metadata = {
  title: "Rules",
  description:
    "Five challenge rules for all nine tiers — calibrated for binary prediction market contract mechanics.",
};

/** Min–max span of a rule across all tiers, e.g. "11%–25%" or "7–15 days". */
function ruleRange(key: keyof Tier): string {
  const vals = TIERS.map((t) => t[key] as number);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return key === "minTradingDays" ? `${min}–${max} days` : `${min}%–${max}%`;
}

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

      {/* The five rules */}
      <section className="border-y border-border bg-surface py-14">
        <Container>
          <h2 className="text-3xl font-semibold tracking-tight">
            Just five rules
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Each one is here to show your edge is real, not luck, and that's
            the whole list. No fine print, no surprises.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RULE_ROWS.map((r, i) => (
              <Card key={r.key as string} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft font-mono text-sm font-semibold text-brand-strong">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{r.label}</h3>
                  <p className="mt-1.5 text-sm text-muted">{r.plain}</p>
                  <p className="mt-2 text-xs font-medium text-brand-strong">
                    {ruleRange(r.key)} by tier
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
