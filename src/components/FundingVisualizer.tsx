"use client";

import { useEffect, useState } from "react";
import { animate, useMotionValue } from "framer-motion";
import { TIERS, usd } from "@/lib/data";

// Nine account tiers, ascending — single source of truth for size + fee.
const STEPS = TIERS.map((t) => ({ size: t.size, fee: t.baseFee })).sort(
  (a, b) => a.size - b.size,
);

export function FundingVisualizer() {
  const progress = useMotionValue(0);
  const [index, setIndex] = useState(0);
  const [pct, setPct] = useState(0);

  // Map the animated 0→1 progress onto the stepped tier index + bar fill.
  useEffect(() => {
    const unsub = progress.on("change", (v) => {
      const clamped = Math.min(1, Math.max(0, v));
      setPct(clamped * 100);
      setIndex(Math.min(STEPS.length - 1, Math.floor(clamped * STEPS.length)));
    });
    return () => unsub();
  }, [progress]);

  // Continuous back-and-forth, no matter what. ease-in-out on every leg, so it
  // accelerates out of each end, peaks through the middle, and eases to a stop
  // before reversing — $5K → $100K → $5K → … forever.
  useEffect(() => {
    const controls = animate(progress, 1, {
      duration: 6.5,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "reverse",
    });
    return () => controls.stop();
  }, [progress]);

  const step = STEPS[index];

  return (
    <div className="py-14 text-center">
      <p className="text-sm font-medium text-brand">Get funded with up to</p>

      <div className="mt-2 text-6xl font-bold tracking-tight tabular-nums text-white sm:text-8xl">
        {usd(step.size)}
      </div>

      <div className="mt-7 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-4 text-sm text-muted">Challenge fee from ${step.fee}</p>
    </div>
  );
}
