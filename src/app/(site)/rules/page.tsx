import type { Metadata } from "next";
import { Container, Card, CtaButton } from "@/components/ui";
import { RulesExplorer } from "@/components/RulesExplorer";
import {
  RULE_ROWS,
  PLATFORM_RULES,
  FUNDED_RULE_ROWS,
  TERMINATION_CONDITIONS,
  BUNDLE_DISCOUNTS,
  TIERS,
  ADDONS,
  addonPrice,
  usd,
  demoTargetUsd,
  staticDrawdownFloorUsd,
} from "@/lib/data";
export const metadata: Metadata = {
  title: "Rules",
  description:
    "The complete Lenium rules framework — six account tiers, evaluation rules, funded account rules, add-ons, and termination conditions.",
};

export default function RulesPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border py-14">
        <Container>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            The complete Lenium rules framework
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted">
            The definitive rule set for the Lenium prediction market prop firm.
            Six account tiers, a flat 20% profit target, 10% static evaluation
            drawdown, no daily loss limit, no minimum trading days, and funded
            accounts with 7-business-day payouts. This is the single source of
            truth.
          </p>
        </Container>
      </section>

      {/* Part One — Six tiers */}
      <section className="py-14">
        <Container>
          <h2 className="text-2xl font-semibold tracking-tight">
            Six account tiers
          </h2>
          <p className="mt-2 max-w-2xl text-muted">
            These are the only account sizes available. No custom sizes, no
            private arrangements. The $25,000 tier is the recommended starting
            point. The $75,000 tier is exclusive to Lenium.
          </p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left">
                  <th className="px-5 py-3 font-semibold">Account size</th>
                  <th className="px-5 py-3 font-semibold">Evaluation fee</th>
                  <th className="px-5 py-3 font-semibold">Reset fee</th>
                  <th className="px-5 py-3 font-semibold">Profit target</th>
                  <th className="px-5 py-3 font-semibold">Static floor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {TIERS.map((t) => (
                  <tr key={t.size}>
                    <td className="px-5 py-3 font-semibold">
                      {usd(t.size)}
                      {t.featured && (
                        <span className="ml-2 text-[10px] font-semibold uppercase text-brand-strong">
                          Popular
                        </span>
                      )}
                      {t.exclusive && (
                        <span className="ml-2 text-[10px] font-semibold uppercase text-brand-strong">
                          Exclusive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">${t.baseFee}</td>
                    <td className="px-5 py-3">${t.resetFee}</td>
                    <td className="px-5 py-3 text-brand-strong">
                      {usd(demoTargetUsd(t))}
                    </td>
                    <td className="px-5 py-3">
                      {usd(staticDrawdownFloorUsd(t))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted">
            Evaluation fees are non-refundable. Reset fees apply after a breach
            or expiry. No monthly subscriptions or hidden charges.
          </p>
        </Container>
      </section>

      {/* Interactive explorer */}
      <section className="border-y border-border bg-surface py-14">
        <Container>
          <h2 className="text-2xl font-semibold tracking-tight">
            Rules by account size
          </h2>
          <p className="mt-2 text-muted">
            Select a tier and preview add-ons. Dollar amounts update to your
            selection; percentage rules are uniform across all six tiers.
          </p>
          <div className="mt-6">
            <RulesExplorer />
          </div>
        </Container>
      </section>

      {/* Part Two — Evaluation */}
      <section className="py-14">
        <Container>
          <h2 className="text-3xl font-semibold tracking-tight">
            Evaluation phase rules
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Trade a simulated account mirroring live Kalshi prices. Hit your
            20% profit target within 30 days (60 with Double Time) without
            breaching the 10% static drawdown floor.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RULE_ROWS.map((r, i) => (
              <Card key={r.label} className="flex gap-4 p-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft font-mono text-sm font-semibold text-brand-strong">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{r.label}</h3>
                  <p className="mt-1 text-sm font-medium text-brand-strong">
                    {r.format(TIERS[2])}
                  </p>
                  <p className="mt-1.5 text-sm text-muted">{r.plain}</p>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold">Rules removed</h3>
            <p className="mt-1 text-sm text-muted">
              Deliberately eliminated to improve the trader experience.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {PLATFORM_RULES.map((r) => (
                <Card key={r.label} className="p-5">
                  <h4 className="font-semibold">{r.label}</h4>
                  <p className="mt-1 text-sm font-medium text-brand-strong">
                    {r.format(TIERS[0])}
                  </p>
                  <p className="mt-1.5 text-sm text-muted">{r.plain}</p>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Part Three — Funded */}
      <section className="border-y border-border bg-surface py-14">
        <Container>
          <h2 className="text-3xl font-semibold tracking-tight">
            Funded account rules
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Upon passing the evaluation, you trade live Kalshi markets with
            Lenium&apos;s capital. No profit target, no time limit — only risk
            rules and the inactivity policy apply.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FUNDED_RULE_ROWS.map((r) => (
              <Card key={r.label} className="p-5">
                <h3 className="font-semibold">{r.label}</h3>
                <p className="mt-1 text-sm font-medium text-brand-strong">
                  {r.format(TIERS[2])}
                </p>
                <p className="mt-1.5 text-sm text-muted">{r.plain}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Part Four — Add-ons */}
      <section className="py-14">
        <Container>
          <h2 className="text-3xl font-semibold tracking-tight">Add-ons</h2>
          <p className="mt-3 max-w-2xl text-muted">
            Five add-ons available at evaluation purchase or any time during an
            active funded account. One-time payments — no subscriptions. Prices
            shown for the $25,000 tier as reference.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {ADDONS.map((a) => (
              <Card key={a.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold">{a.name}</h3>
                  <span className="shrink-0 font-semibold text-brand-strong">
                    {a.flat != null
                      ? `$${a.flat}`
                      : `+$${addonPrice(a, TIERS[2].baseFee)}`}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">{a.blurb}</p>
              </Card>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
            <h3 className="font-semibold">Bundle discounts</h3>
            <p className="mt-1 text-sm text-muted">
              Purchasing multiple add-ons together applies an automatic discount
              at checkout.
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {BUNDLE_DISCOUNTS.map((b) => (
                <li key={b.count} className="text-sm">
                  <span className="font-medium">{b.count} add-ons:</span>{" "}
                  <span className="text-brand-strong">{b.pct}% off</span> total
                  add-on cost
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* Part Five — Termination */}
      <section className="border-y border-border bg-surface py-14">
        <Container>
          <h2 className="text-3xl font-semibold tracking-tight">
            Account termination
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            A funded or evaluation account is terminated under any of the
            following conditions. Open positions are force-liquidated at
            prevailing Kalshi prices. Net profit not yet paid out is paid at
            the next standard payout cycle. Evaluation fees are never refunded.
          </p>
          <ul className="mt-6 space-y-3">
            {TERMINATION_CONDITIONS.map((c) => (
              <li
                key={c}
                className="flex gap-3 rounded-xl border border-border bg-background p-4 text-sm"
              >
                <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-brand" />
                {c}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-14">
        <Container className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Ready to start?
            </h2>
            <p className="mt-2 text-muted">
              Build your challenge with the live pricing calculator.
            </p>
          </div>
          <CtaButton href="/pricing">View pricing</CtaButton>
        </Container>
      </section>
    </>
  );
}
