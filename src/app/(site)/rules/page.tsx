import type { Metadata } from "next";
import { Container, Card, CtaButton } from "@/components/ui";
import { RulesExplorer } from "@/components/RulesExplorer";
import {
  RULE_ROWS,
  FUNDED_RULE_ROWS,
  TERMINATION_CONDITIONS,
  BUNDLE_DISCOUNTS,
  UNCHANGED_RULES,
  RULES_INTRO,
  RULES_CONCLUSION,
  TIERS,
  ADDONS,
  addonPriceLabel,
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
            The Lenium Platform — Final Complete Rules Framework
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted">{RULES_INTRO}</p>
          <p className="mt-4 max-w-3xl text-muted">
            Six account tiers. A flat 20% profit target. 10% static evaluation
            drawdown. No daily loss limit. No minimum trading days. 7-business-day
            funded payouts. This document supersedes all previous rule versions
            and is the single source of truth.
          </p>
        </Container>
      </section>

      {/* Part One — Six tiers */}
      <section className="py-14">
        <Container>
          <h2 className="text-2xl font-semibold tracking-tight">
            Part One — The six account tiers
          </h2>
          <p className="mt-2 max-w-3xl text-muted">
            Lenium offers exactly six account sizes — no exceptions, no custom
            sizes, no private arrangements. Each tier has a one-time evaluation
            fee (non-refundable) and a discounted reset fee after a breach or
            expiry. No monthly subscriptions or hidden charges.
          </p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left">
                  <th className="px-5 py-3 font-semibold">Account size</th>
                  <th className="px-5 py-3 font-semibold">Evaluation fee</th>
                  <th className="px-5 py-3 font-semibold">Reset fee</th>
                  <th className="px-5 py-3 font-semibold">Profit target (20%)</th>
                  <th className="px-5 py-3 font-semibold">Static floor (10%)</th>
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
            The $25,000 tier is the recommended starting point. The $75,000
            tier is unique to Lenium — not offered by any other prediction market
            prop firm.
          </p>
        </Container>
      </section>

      {/* Tier comparison + interactive explorer */}
      <section className="border-y border-border bg-surface py-14">
        <Container>
          <h2 className="text-2xl font-semibold tracking-tight">
            Rules across all six tiers
          </h2>
          <p className="mt-2 max-w-3xl text-muted">
            Percentage rules are uniform on every tier. Dollar amounts scale with
            account size. Select a tier below to preview add-on effects and see
            full evaluation and funded detail.
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
            Part Two — Evaluation phase rules
          </h2>
          <p className="mt-3 max-w-3xl text-muted">
            Trade a simulated account mirroring live Kalshi prices. Achieve the
            20% profit target within 30 calendar days (60 with Double Time)
            while respecting all risk rules. Portfolio value including open
            positions is calculated in real time from the Kalshi data feed.
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
        </Container>
      </section>

      {/* Part Three — Funded */}
      <section className="border-y border-border bg-surface py-14">
        <Container>
          <h2 className="text-3xl font-semibold tracking-tight">
            Part Three — Funded account rules
          </h2>
          <p className="mt-3 max-w-3xl text-muted">
            Upon passing the evaluation, Lenium allocates real firm capital equal
            to your account reference balance. No profit target, no time limit, no
            performance review cycle — only risk rules and the inactivity policy
            apply. Position and exposure limits scale with your current balance
            as the account grows.
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
          <h2 className="text-3xl font-semibold tracking-tight">
            Part Four — The add-on system
          </h2>
          <p className="mt-3 max-w-3xl text-muted">
            Five add-ons available at evaluation purchase or any time during an
            active funded account. One-time payments — no subscriptions. They
            apply permanently to the account they are purchased for.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {ADDONS.map((a) => (
              <Card key={a.id} className="p-5">
                <h3 className="font-semibold">{a.name}</h3>
                <p className="mt-2 text-sm text-muted">{a.blurb}</p>
              </Card>
            ))}
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="border-b border-border bg-surface-muted px-5 py-3 text-sm font-semibold">
              Add-on prices by tier
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 font-semibold">Add-on</th>
                  {TIERS.map((t) => (
                    <th key={t.size} className="px-3 py-3 font-semibold">
                      {usd(t.size)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ADDONS.map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-3 text-muted">{a.name}</td>
                    {TIERS.map((t) => (
                      <td key={t.size} className="px-3 py-3 font-medium">
                        {addonPriceLabel(a, t.baseFee)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
            <h3 className="font-semibold">Bundle discounts</h3>
            <p className="mt-1 text-sm text-muted">
              Purchasing multiple add-ons together applies an automatic discount
              at checkout, displayed before payment.
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
            Part Five — Account termination conditions
          </h2>
          <p className="mt-3 max-w-3xl text-muted">
            A funded or evaluation account is terminated under any of the
            following conditions. Open positions are force-liquidated at
            prevailing Kalshi prices. Net profit not yet paid out is paid at the
            next standard payout cycle. Evaluation fees are never refunded.
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

      {/* Part Six — Unchanged */}
      <section className="py-14">
        <Container>
          <h2 className="text-3xl font-semibold tracking-tight">
            Part Six — What has not changed
          </h2>
          <p className="mt-3 max-w-3xl text-muted">
            Three elements remain unchanged from the original framework as
            deliberate decisions.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {UNCHANGED_RULES.map((r) => (
              <Card key={r.title} className="p-5">
                <h3 className="font-semibold">{r.title}</h3>
                <p className="mt-2 text-sm text-muted">{r.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Conclusion */}
      <section className="border-y border-border bg-surface py-14">
        <Container>
          <h2 className="text-2xl font-semibold tracking-tight">Conclusion</h2>
          <p className="mt-4 max-w-3xl text-muted">{RULES_CONCLUSION}</p>
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
