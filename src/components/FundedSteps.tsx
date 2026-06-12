"use client";

import { motion, type Variants } from "framer-motion";
import { useEffect, useState } from "react";
import { CtaButton } from "@/components/ui";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Step 01 — account-size chips that light up in sequence. */
function ChooseVisual() {
  const chips = ["$5K", "$15K", "$50K", "$100K"];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % chips.length), 1100);
    return () => clearInterval(t);
  }, [chips.length]);
  return (
    <div className="flex gap-2">
      {chips.map((c, i) => (
        <span
          key={c}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors duration-500 ${
            i === active
              ? "bg-brand text-[#04130b]"
              : "bg-white/[0.06] text-white/50"
          }`}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

/** Step 02 — a live drawing sparkline + a flickering Yes price. */
function ProveVisual() {
  const vals = [64, 67, 61, 70, 66];
  const [yes, setYes] = useState(vals[0]);
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % vals.length;
      setYes(vals[i]);
    }, 1200);
    return () => clearInterval(t);
  }, [vals]);
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 80 32" className="h-8 w-20 overflow-visible">
        <motion.path
          d="M0 26 L12 18 L24 22 L36 10 L48 14 L60 5 L80 8"
          fill="none"
          stroke="#1ee089"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0.4 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 2.2,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
      </svg>
      <span className="rounded-md border border-emerald-400/40 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-300">
        Yes {yes}%
      </span>
    </div>
  );
}

/** Step 03 — a drawing checkmark + a pulsing payout share. */
function FundedVisual() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 place-items-center rounded-full bg-brand-soft">
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="#1ee089"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M20 6 L9 17 L4 12"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 1,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "reverse",
              repeatDelay: 0.8,
            }}
          />
        </svg>
      </span>
      <motion.span
        className="text-sm font-semibold text-white"
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        95% yours
      </motion.span>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    t: "Choose your challenge",
    d: "Pick an account size from $5,000 to $100,000 and any add-ons that fit your style.",
    Visual: ChooseVisual,
  },
  {
    n: "02",
    t: "Prove your edge",
    d: "Trade a simulated account that mirrors live Kalshi prices in real time. Hit your target within the rules.",
    Visual: ProveVisual,
  },
  {
    n: "03",
    t: "Get funded",
    d: "Pass and receive a funded Kalshi sub-account with real capital. Keep up to 95% of profits.",
    Visual: FundedVisual,
  },
];

export function FundedSteps() {
  return (
    <>
      <h2 className="text-3xl font-semibold tracking-tight">
        Funded in three steps
      </h2>

      <motion.div
        className="mt-10 grid gap-5 md:grid-cols-3"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        {STEPS.map(({ n, t, d, Visual }) => (
          <motion.div
            key={n}
            variants={item}
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-brand/50"
          >
            <span className="font-mono text-sm text-brand">{n}</span>
            <div className="mt-4 flex h-9 items-center">
              <Visual />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-muted">{d}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-8">
        <CtaButton href="/how-it-works" variant="ghost">
          See the full process
        </CtaButton>
      </div>
    </>
  );
}
