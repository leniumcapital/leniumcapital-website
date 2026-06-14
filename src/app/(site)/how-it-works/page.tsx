import type { Metadata } from "next";
import { Container, CtaButton, Card, PillBadge } from "@/components/ui";
import { FaqList } from "@/components/Faq";
import { FAQS, EARLY_WITHDRAWAL } from "@/lib/data";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Choose a challenge, prove your edge on simulated Kalshi prices, and get funded with real capital.",
};

export default function HowItWorksPage() {
  return (
    <>
      <section className="border-b border-border py-16">
        <Container>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            From challenge to funded account
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            You never risk your own capital. Prove your edge once, then trade
            ours.
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container className="space-y-16">
          <Step
            n="01"
            title="Choose your account size and add-ons"
            body="Pick from nine tiers between $5,000 and $100,000. Layer on a higher profit split, a drawdown boost, more time, or faster payouts. Your fee is computed live at checkout — one simple, upfront price."
            cta={<CtaButton href="/pricing">Build your challenge</CtaButton>}
            mock={<MockSelect />}
          />
          <Step
            n="02"
            title="Trade prediction markets on your Lenium account"
            body="Your evaluation account mirrors live Kalshi prices in real time on a simulated balance. Hit your profit target without breaching the drawdown, daily loss, or position-size limits, across the minimum number of trading days."
            cta={<CtaButton href="/rules" variant="ghost">Read the rules</CtaButton>}
            mock={<MockDashboard />}
            reverse
          />
          <Step
            n="03"
            title="Pass your challenge and get funded"
            body="Sign your trader agreement and receive a funded Kalshi sub-account with real capital. Trade live markets and earn a share of profits on a 14-day payout cycle — paid in USD by ACH to your bank account."
            cta={<CtaButton href="/leaderboard" variant="ghost">See funded traders</CtaButton>}
            mock={<MockPayout />}
          />
        </Container>
      </section>

      {/* Early withdrawal */}
      <section className="border-y border-border bg-surface py-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <PillBadge tone="brand">Industry first</PillBadge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                Need your profits early?
              </h2>
              <p className="mt-4 text-muted">
                Request profits before your payout date for a transparent
                liquidity service fee — not a loan, not interest. The earlier you
                ask, the higher the fee.
              </p>
            </div>
            <Card className="self-center">
              <div className="divide-y divide-border">
                {EARLY_WITHDRAWAL.map((e) => (
                  <div
                    key={e.range}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <span className="text-muted">{e.range}</span>
                    <span className="font-semibold">{e.feePct}% fee</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 scroll-mt-20">
        <Container>
          <h2 className="text-3xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="mt-8 max-w-3xl">
            <FaqList items={FAQS} />
          </div>
        </Container>
      </section>
    </>
  );
}

function Step({
  n,
  title,
  body,
  cta,
  mock,
  reverse,
}: {
  n: string;
  title: string;
  body: string;
  cta: ReactNode;
  mock: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div className={reverse ? "lg:order-2" : ""}>
        <span className="font-mono text-sm text-brand">Step {n}</span>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        <p className="mt-4 text-muted">{body}</p>
        <div className="mt-6">{cta}</div>
      </div>
      <div className={reverse ? "lg:order-1" : ""}>
        <BrowserFrame>{mock}</BrowserFrame>
      </div>
    </div>
  );
}

function BrowserFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-4 py-3">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="ml-3 truncate rounded-md bg-background px-2 py-0.5 text-xs text-muted">
          lenium.capital
        </span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function MockSelect() {
  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">
        Account size
      </div>
      <div className="grid grid-cols-3 gap-2">
        {["$10k", "$25k", "$50k"].map((s, i) => (
          <div
            key={s}
            className={`rounded-lg border p-3 text-center text-sm font-semibold ${
              i === 1
                ? "border-brand bg-brand-soft text-brand-strong"
                : "border-border"
            }`}
          >
            {s}
          </div>
        ))}
      </div>
      <div className="space-y-2 pt-2">
        {[
          ["90% profit split", "$67"],
          ["Fast payout", "$39"],
        ].map(([l, p]) => (
          <div
            key={l}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span>{l}</span>
            <span className="font-medium text-muted">{p}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-lg bg-foreground px-3 py-3 text-background">
        <span className="text-sm">Total today</span>
        <span className="font-semibold">$345</span>
      </div>
    </div>
  );
}

function MockDashboard() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Balance", "$26,840"],
          ["P&L", "+7.4%"],
          ["Drawdown", "2.1%"],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-border p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted">
              {l}
            </div>
            <div className="text-sm font-semibold">{v}</div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[
          ["NBA · Lakers ML", "62¢", "green"],
          ["CPI < 3.1%", "44¢", "green"],
          ["Fed cut in June", "71¢", "amber"],
        ].map(([m, p, tone]) => (
          <div
            key={m}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span>{m}</span>
            <span className="flex items-center gap-2">
              <span className="font-mono">{p}</span>
              <span
                className={`size-2 rounded-full ${
                  tone === "amber" ? "bg-amber-400" : "bg-brand"
                }`}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockPayout() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-brand/40 bg-brand-soft p-4">
        <div className="text-xs font-medium text-brand-strong">
          Payout approved
        </div>
        <div className="mt-1 text-2xl font-semibold text-brand-strong">
          $4,182.00
        </div>
        <div className="text-xs text-brand-strong/80">
          90% split · ACH to •••• 4471
        </div>
      </div>
      <div className="space-y-2 text-sm">
        {[
          ["Gross profit", "$4,646.67"],
          ["Your split (90%)", "$4,182.00"],
          ["Next cycle", "in 7 days"],
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between">
            <span className="text-muted">{l}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
