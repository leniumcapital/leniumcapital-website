"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { CtaButton } from "@/components/ui";
import {
  PayoutApprovedDemo,
  TierSelectorDemo,
  TradingDashboardDemo,
} from "@/components/how-it-works/HowItWorksDemos";

const MONO =
  "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace";

const STEPS = [
  {
    n: "01",
    title: "Choose your account size and add-ons",
    body: "Six tiers. Five optional add-ons. One upfront price.",
    cta: <CtaButton href="/pricing">Build your challenge</CtaButton>,
    mock: <TierSelectorDemo />,
    reverse: false,
  },
  {
    n: "02",
    title: "Trade prediction markets on your Lenium account",
    body: "Mirrors live Kalshi prices. Hit 20%, stay inside 10% drawdown.",
    cta: (
      <CtaButton href="/rules" variant="ghost">
        Read the rules
      </CtaButton>
    ),
    mock: <TradingDashboardDemo />,
    reverse: true,
  },
  {
    n: "03",
    title: "Pass your challenge and get funded",
    body: "Funded Kalshi sub-account. Paid by ACH every 7 days.",
    cta: (
      <CtaButton href="/leaderboard" variant="ghost">
        See funded traders
      </CtaButton>
    ),
    mock: <PayoutApprovedDemo />,
    reverse: false,
  },
] as const;

function StepBadge({ n }: { n: string }) {
  return (
    <span
      className="grid size-[26px] shrink-0 place-items-center rounded-full text-xs font-bold text-brand"
      style={{
        fontFamily: MONO,
        border: "0.5px solid #1A3A20",
        background: "rgba(0,232,122,0.07)",
      }}
    >
      {n}
    </span>
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

function StepBlock({
  n,
  title,
  body,
  cta,
  mock,
  reverse,
  isLast,
}: {
  n: string;
  title: string;
  body: string;
  cta: ReactNode;
  mock: ReactNode;
  reverse?: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="relative grid items-center gap-10 pl-10 lg:grid-cols-2">
      {!isLast && (
        <div
          className="absolute left-[12px] top-[26px] w-[2px] bg-[#1C1C1C]"
          style={{ bottom: "-4rem" }}
          aria-hidden
        />
      )}
      <motion.div
        className="absolute left-[12px] top-[26px] w-[2px] origin-top bg-[#00E87A]"
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        style={{ height: isLast ? 26 : "calc(100% + 4rem)" }}
        aria-hidden
      />
      <div className="absolute left-0 top-0">
        <StepBadge n={n} />
      </div>

      <div className={reverse ? "lg:order-2" : ""}>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        <p className="mt-1.5 text-[13px] text-[#888888]">{body}</p>
        <div className="mt-6">{cta}</div>
      </div>
      <div className={reverse ? "lg:order-1" : ""}>
        <BrowserFrame>{mock}</BrowserFrame>
      </div>
    </div>
  );
}

export function HowItWorksSteps() {
  return (
    <div className="space-y-16">
      {STEPS.map((step, i) => (
        <StepBlock key={step.n} {...step} isLast={i === STEPS.length - 1} />
      ))}
    </div>
  );
}
