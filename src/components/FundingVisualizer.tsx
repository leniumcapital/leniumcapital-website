"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useMotionValue } from "framer-motion";
import { TIERS, usd } from "@/lib/data";

// Nine account tiers, ascending — single source of truth for size + fee.
const STEPS = TIERS.map((t) => ({ size: t.size, fee: t.baseFee })).sort(
  (a, b) => a.size - b.size,
);

export function FundingVisualizer() {
  const ref = useRef<HTMLDivElement>(null);
  const played = useRef(false);
  const progress = useMotionValue(0);

  const [index, setIndex] = useState(0);
  const [pct, setPct] = useState(0);

  // Map the animated 0→1 progress onto the stepped tier index + bar fill.
  useEffect(() => {
    const unsub = progress.on("change", (v) => {
      setPct(Math.min(100, Math.max(0, v * 100)));
      setIndex(Math.min(STEPS.length - 1, Math.floor(v * STEPS.length)));
    });
    return () => unsub();
  }, [progress]);

  // Fire once, when the block is 30% into the viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !played.current) {
          played.current = true;
          obs.disconnect();
          // ease-in-out cubic — accelerates in, decelerates out (not linear).
          animate(progress, 1, { duration: 1.5, ease: [0.65, 0, 0.35, 1] });
        }
      },
      { threshold: 0.3 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [progress]);

  const step = STEPS[index];

  return (
    <div ref={ref} className="py-14 text-center">
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
