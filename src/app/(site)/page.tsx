import Link from "next/link";
import { Container, CtaButton, Card, PillBadge } from "@/components/ui";
import { MarketTickers } from "@/components/MarketTickers";
import { FundingVisualizer } from "@/components/FundingVisualizer";
import { TIERS, STATS, usd } from "@/lib/data";

const FOUNDATION = [
  { title: "Fully regulated foundation", value: "Built on Kalshi, a CFTC-licensed exchange" },
  { title: "Paid in real US dollars", value: "Withdrawals straight to your bank account" },
  { title: "Available nationwide", value: "All 50 US states" },
  { title: "No crypto, ever", value: "No wallet, no blockchain, no USDC" },
  { title: "Capital that scales with you", value: "Nine tiers from $5K to $100K" },
  { title: "Keep more of your profits", value: "Profit splits up to 95% in your favor" },
  { title: "Rules made for prediction markets", value: "Calibrated for binary contract mechanics" },
  { title: "Fast, flexible payouts", value: "14-day cycles, plus 7-day and early access" },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative -mt-16 flex min-h-screen items-center overflow-hidden bg-[#05060a] pt-16 text-white">
        {/* Flowing aurora background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="aurora-blob anim-aurora-a"
            style={{
              width: "46rem",
              height: "46rem",
              left: "-12%",
              top: "6%",
              background:
                "radial-gradient(circle, rgba(30,224,137,0.55), transparent 70%)",
            }}
          />
          <div
            className="aurora-blob anim-aurora-b"
            style={{
              width: "40rem",
              height: "40rem",
              right: "-10%",
              top: "-6%",
              background:
                "radial-gradient(circle, rgba(45,212,191,0.45), transparent 70%)",
            }}
          />
          <div
            className="aurora-blob anim-aurora-c"
            style={{
              width: "48rem",
              height: "48rem",
              right: "0%",
              bottom: "-22%",
              background:
                "radial-gradient(circle, rgba(124,92,246,0.42), transparent 70%)",
            }}
          />
          <div
            className="aurora-blob anim-aurora-a"
            style={{
              width: "34rem",
              height: "34rem",
              left: "18%",
              bottom: "-18%",
              animationDelay: "-9s",
              background:
                "radial-gradient(circle, rgba(236,72,153,0.3), transparent 70%)",
            }}
          />
          <div className="absolute inset-0 grain opacity-[0.12]" />
        </div>

        {/* Live, interactive Kalshi-style tickers floating behind the hero */}
        <MarketTickers />

        {/* Legibility overlay — dims tickers behind the headline. Lets clicks
            pass through (pointer-events-none) so the tickers stay interactive. */}
        <div
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            background:
              "radial-gradient(75% 62% at 50% 49%, rgba(5,6,10,0.99) 0%, rgba(5,6,10,0.97) 30%, rgba(5,6,10,0.82) 52%, rgba(5,6,10,0.35) 70%, rgba(5,6,10,0) 84%), linear-gradient(to bottom, rgba(5,6,10,0.7), rgba(5,6,10,0) 22%, rgba(5,6,10,0) 78%, rgba(5,6,10,0.88))",
          }}
        />

        <Container className="pointer-events-none relative z-30 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-brand" />
            The world&apos;s first CFTC-regulated prediction market prop firm
          </span>

          <h1 className="mx-auto mt-7 max-w-4xl text-5xl font-semibold leading-[1.04] tracking-tight sm:text-7xl">
            Lenium is building{" "}
            <span className="font-serif font-normal italic text-white">
              the future
            </span>{" "}
            of the prediction economy
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-lg text-white/70">
            Get funded to trade prediction markets on Kalshi. Prove your edge in
            our evaluation challenge, then trade real capital and keep up to 95%
            of the profits.
          </p>

          <div className="pointer-events-auto mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-[#04130b] transition-colors hover:bg-brand-strong"
            >
              Start your challenge
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              How it works
            </Link>
          </div>

          <p className="mt-7 text-sm font-medium text-white/60">
            Built on Kalshi. CFTC-regulated. Available in all 50 states.
          </p>
        </Container>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border bg-surface">
        <Container className="grid grid-cols-2 gap-6 py-10 sm:grid-cols-4">
          {[
            { v: STATS.kalshiVolume2025, l: "Kalshi 2025 volume" },
            { v: STATS.kalshiMau, l: "Monthly active users" },
            { v: STATS.activeTraders, l: "Active Kalshi traders" },
            { v: STATS.payoutsIndustry, l: "Paid to funded traders" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {s.v}
              </div>
              <div className="mt-1 text-sm text-muted">{s.l}</div>
            </div>
          ))}
        </Container>
      </section>

      {/* First of its kind */}
      <section className="py-20">
        <Container>
          <div className="max-w-2xl">
            <PillBadge tone="brand">The first of its kind</PillBadge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              The first prediction market prop firm in the world
            </h2>
            <p className="mt-4 text-muted">
              No one had built a funded-trader firm on regulated prediction
              markets — until Lenium. Everything runs on Kalshi, the
              CFTC-regulated exchange, so the entire operation is compliant,
              USD-settled, and built for serious traders from day one.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border bg-surface-muted px-6 py-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                What you get with Lenium
              </h3>
              <span className="hidden text-xs font-medium text-brand-strong sm:block">
                Every box checked
              </span>
            </div>
            <ul className="divide-y divide-border">
              {FOUNDATION.map((f) => (
                <li
                  key={f.title}
                  className="flex items-start gap-4 px-6 py-4 sm:items-center"
                >
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft sm:mt-0">
                    <svg
                      className="size-3.5 text-brand-strong"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                  <div className="flex flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <span className="font-medium">{f.title}</span>
                    <span className="text-sm text-muted sm:text-right">
                      {f.value}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* How it works teaser */}
      <section className="border-y border-border bg-surface py-20">
        <Container>
          <h2 className="text-3xl font-semibold tracking-tight">
            Funded in three steps
          </h2>

          <FundingVisualizer />

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Choose your challenge",
                d: "Pick an account size from $5,000 to $100,000 and any add-ons that fit your style.",
              },
              {
                n: "02",
                t: "Prove your edge",
                d: "Trade a simulated account that mirrors live Kalshi prices in real time. Hit your target within the rules.",
              },
              {
                n: "03",
                t: "Get funded",
                d: "Pass and receive a funded Kalshi sub-account with real capital. Keep up to 95% of profits.",
              },
            ].map((s) => (
              <Card key={s.n}>
                <span className="font-mono text-sm text-brand">{s.n}</span>
                <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted">{s.d}</p>
              </Card>
            ))}
          </div>
          <div className="mt-8">
            <CtaButton href="/how-it-works" variant="ghost">
              See the full process
            </CtaButton>
          </div>
        </Container>
      </section>

      {/* Tiers teaser */}
      <section className="py-20">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight">
                Nine tiers. Four of them uncontested.
              </h2>
              <p className="mt-4 text-muted">
                Any trader who wants $15k, $20k, $35k, or $75k in prediction
                market funding has exactly one option in the world.
              </p>
            </div>
            <CtaButton href="/pricing">Compare all tiers</CtaButton>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
            {TIERS.map((t) => (
              <Link
                key={t.size}
                href="/pricing"
                className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-brand/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl font-semibold tracking-tight">
                    {usd(t.size)}
                  </span>
                  {t.exclusive && (
                    <PillBadge tone="brand">Exclusive</PillBadge>
                  )}
                </div>
                <div className="mt-3 text-sm text-muted">
                  from{" "}
                  <span className="font-semibold text-foreground">
                    ${t.baseFee}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted">
                  {t.profitTargetPct}% target · ~{t.passRatePct}% pass
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-surface py-20">
        <Container className="text-center">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            The name means nothing today. In five years it will mean everything
            to every serious prediction market trader.
          </h2>
          <div className="mt-8 flex justify-center">
            <CtaButton href="/signup">Start your challenge</CtaButton>
          </div>
        </Container>
      </section>
    </>
  );
}

