import Link from "next/link";
import { IconBrandX, IconMail } from "@tabler/icons-react";
import { Container, CtaButton, PillBadge } from "@/components/ui";
import { StartChallengeCta } from "@/components/StartChallengeCta";
import { MarketTickers } from "@/components/MarketTickers";
import { FundingVisualizer } from "@/components/FundingVisualizer";
import { FundedSteps } from "@/components/FundedSteps";
import { TierTeaserGrid } from "@/components/TierTeaserGrid";
import { STATS } from "@/lib/data";
import { SITE_EMAIL, SITE_TWITTER_URL } from "@/lib/site";

const FOUNDATION = [
  { title: "Fully regulated foundation", value: "Built on Kalshi, a CFTC-licensed exchange" },
  { title: "Paid in real US dollars", value: "Withdrawals straight to your bank account" },
  { title: "Available nationwide", value: "All 50 US states" },
  { title: "No crypto, ever", value: "No wallet, no blockchain, no USDC" },
  { title: "Capital that scales with you", value: "Six tiers from $5K to $100K" },
  { title: "Keep more of your profits", value: "Profit splits up to 90% in your favor" },
  { title: "Rules made for prediction markets", value: "Calibrated for binary contract mechanics" },
  { title: "Fast, flexible payouts", value: "7-business-day cycles, 3-day with Fast Payout" },
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
            our evaluation challenge, then trade real capital and keep up to 90%
            of the profits.
          </p>

          <div className="pointer-events-auto mt-9 flex flex-wrap items-center justify-center gap-3">
            <StartChallengeCta variant="hero" />
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

      {/* Funding visualizer */}
      <section className="py-16">
        <Container>
          <FundingVisualizer />
        </Container>
      </section>

      {/* Funded in three steps */}
      <section className="border-y border-border bg-surface py-20">
        <Container>
          <FundedSteps />
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

      {/* Tiers teaser */}
      <section className="py-20">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight">
                Six tiers. One of them exclusive.
              </h2>
              <p className="mt-4 text-muted">
                The $75,000 tier is exclusive to Lenium — a natural step between
                $50K and $100K that no other prediction market prop firm offers.
              </p>
            </div>
            <CtaButton href="/pricing">Compare all tiers</CtaButton>
          </div>

          <TierTeaserGrid />
        </Container>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-white/10 bg-[#05060a] py-24 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="aurora-blob anim-aurora-b"
            style={{
              width: "32rem",
              height: "32rem",
              left: "10%",
              top: "-20%",
              background:
                "radial-gradient(circle, rgba(30,224,137,0.35), transparent 70%)",
            }}
          />
          <div
            className="aurora-blob anim-aurora-c"
            style={{
              width: "36rem",
              height: "36rem",
              right: "-8%",
              bottom: "-30%",
              background:
                "radial-gradient(circle, rgba(124,92,246,0.3), transparent 70%)",
            }}
          />
          <div className="absolute inset-0 grain opacity-[0.08]" />
        </div>

        <Container className="relative z-10 text-center">
          <h2 className="mx-auto max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for serious prediction market traders.
          </h2>
          <div className="mt-8 flex justify-center">
            <StartChallengeCta variant="cta" />
          </div>
          <div className="mt-8 flex items-center justify-center gap-3">
            <a
              href={SITE_TWITTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Lenium on X"
              className="inline-flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/70 transition-colors hover:border-brand/50 hover:bg-brand/10 hover:text-brand"
            >
              <IconBrandX size={20} stroke={1.75} aria-hidden />
            </a>
            <a
              href={`mailto:${SITE_EMAIL}`}
              aria-label="Email Lenium"
              className="inline-flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/70 transition-colors hover:border-brand/50 hover:bg-brand/10 hover:text-brand"
            >
              <IconMail size={20} stroke={1.75} aria-hidden />
            </a>
          </div>
        </Container>
      </section>
    </>
  );
}

