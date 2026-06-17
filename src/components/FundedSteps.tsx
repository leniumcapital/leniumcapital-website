"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useTransform,
  type Variants,
} from "framer-motion";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CtaButton } from "@/components/ui";
import { TIERS, compactTier } from "@/lib/pricing";

const MONO =
  "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace";

const DEMO_TIERS = TIERS.filter((t) =>
  [5_000, 10_000, 25_000, 50_000, 75_000, 100_000].includes(t.size),
);

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

function StepBadge({ n }: { n: string }) {
  return (
    <span
      className="grid size-[26px] shrink-0 place-items-center rounded-full text-xs font-bold text-[#00E87A]"
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

function DemoZone({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex h-[120px] w-full flex-col justify-center overflow-hidden rounded-[10px] p-[18px] md:h-[120px]"
      style={{
        background: "#0D0D0D",
        border: "0.5px solid #1C1C1C",
      }}
    >
      {children}
    </div>
  );
}

function tierMetaLine(tierIndex: number): string {
  const tier = DEMO_TIERS[tierIndex];
  if (!tier) return "";
  const targetPct = Math.round(tier.profitTarget * 100);
  return `$${tier.fee} one-time · ${targetPct}% target`;
}

/** Step 01 — interactive tier grid with sliding highlight. */
function ChooseVisual() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResume = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const scheduleResume = useCallback(() => {
    clearResume();
    resumeTimer.current = setTimeout(() => setPaused(false), 4000);
  }, [clearResume]);

  const select = useCallback(
    (index: number) => {
      setActive(index);
      setPaused(true);
      scheduleResume();
    },
    [scheduleResume],
  );

  useEffect(() => {
    if (paused) return;
    const t = setInterval(
      () => setActive((a) => (a + 1) % DEMO_TIERS.length),
      2800,
    );
    return () => clearInterval(t);
  }, [paused]);

  useEffect(() => () => clearResume(), [clearResume]);

  return (
    <div
      className="flex h-full flex-col justify-center gap-2"
      onMouseEnter={() => {
        setPaused(true);
        clearResume();
      }}
      onMouseLeave={scheduleResume}
    >
      <div className="grid grid-cols-3 gap-1.5">
        {DEMO_TIERS.map((tier, i) => {
          const label = compactTier(tier.size);
          const selected = i === active;
          return (
            <button
              key={tier.size}
              type="button"
              onClick={() => select(i)}
              onMouseEnter={() => select(i)}
              className="relative flex h-8 items-center justify-center rounded-[7px] border border-[#1C1C1C] bg-[#161616] text-[11px] font-semibold text-[#777777] transition-colors duration-150"
              style={{ fontFamily: MONO }}
            >
              {selected && (
                <motion.span
                  layoutId="funded-tier-highlight"
                  className="absolute inset-0 rounded-[7px] bg-[#00E87A]"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <span
                className={`relative z-10 ${selected ? "font-bold text-[#0A0A0A]" : ""}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex h-4 items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-center text-[11px] text-[#555555]"
            style={{ fontFamily: MONO }}
          >
            {tierMetaLine(active)}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Step 02 — scrolling live-style chart + ticking probability. */
function ProveVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prob, setProb] = useState(67);
  const pointsRef = useRef<number[]>([]);

  useEffect(() => {
    const pts: number[] = [];
    let v = 0.42;
    for (let i = 0; i < 48; i++) {
      v += 0.004 + (Math.random() - 0.45) * 0.02;
      v = Math.min(0.88, Math.max(0.28, v));
      pts.push(v);
    }
    pointsRef.current = pts;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const pts = pointsRef.current;
      if (pts.length > 2) {
        const last = pts[pts.length - 1] ?? 0.5;
        const next =
          last + 0.004 + (Math.random() - 0.45) * 0.018;
        pts.shift();
        pts.push(Math.min(0.88, Math.max(0.28, next)));
      }

      ctx.clearRect(0, 0, w, h);

      const pad = 4;
      const innerW = w - pad * 2;
      const innerH = h - pad * 2;
      const step = innerW / (pts.length - 1);

      const coords = pts.map((p, i) => ({
        x: pad + i * step,
        y: pad + innerH - p * innerH,
      }));

      const grad = ctx.createLinearGradient(0, pad, 0, h);
      grad.addColorStop(0, "rgba(0,232,122,0.15)");
      grad.addColorStop(1, "rgba(0,232,122,0)");

      ctx.beginPath();
      ctx.moveTo(coords[0]?.x ?? pad, h);
      for (const c of coords) ctx.lineTo(c.x, c.y);
      ctx.lineTo(coords[coords.length - 1]?.x ?? w, h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(coords[0]?.x ?? pad, coords[0]?.y ?? 0);
      for (let i = 1; i < coords.length; i++) {
        const c = coords[i];
        if (c) ctx.lineTo(c.x, c.y);
      }
      ctx.strokeStyle = "#00E87A";
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setProb((p) => {
        const delta = Math.floor(Math.random() * 3) + 1;
        const dir = Math.random() > 0.5 ? 1 : -1;
        return Math.min(75, Math.max(60, p + delta * dir));
      });
    }, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-0 top-0 z-10 flex items-center gap-1.5">
        <motion.span
          className="size-1.5 rounded-full bg-[#00E87A]"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <span
          className="text-[10px] font-semibold tracking-[0.05em] text-[#00E87A]"
        >
          LIVE
        </span>
      </div>
      <motion.span
        key={prob}
        initial={{ opacity: 0.7, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute bottom-0 right-0 z-10 rounded-md border border-[rgba(0,232,122,0.3)] bg-[rgba(0,232,122,0.1)] px-2.5 py-0.5 text-xs font-bold text-[#00E87A]"
        style={{
          fontFamily: MONO,
          borderWidth: "0.5px",
        }}
      >
        Yes {prob}%
      </motion.span>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

/** Step 03 — animated profit-split bar + counting payout. */
function FundedVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [barDone, setBarDone] = useState(false);

  const spring = useMotionValue(0);
  const payoutDisplay = useTransform(spring, (v) =>
    `$${Math.round(v).toLocaleString("en-US")}`,
  );
  const [payoutText, setPayoutText] = useState("$0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(spring, 1847, { duration: 0.9, ease: "easeOut" });
    const unsub = payoutDisplay.on("change", (v) => setPayoutText(v));
    const t = setTimeout(() => setBarDone(true), 700);
    return () => {
      controls.stop();
      unsub();
      clearTimeout(t);
    };
  }, [inView, spring, payoutDisplay]);

  return (
    <div ref={ref} className="flex h-full flex-col justify-center gap-3">
      <div className="flex h-9 w-full overflow-hidden rounded-lg bg-[#161616]">
        <motion.div
          className="relative flex h-full items-center bg-[#00E87A]"
          initial={{ width: "0%" }}
          animate={inView ? { width: "90%" } : { width: "0%" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          onAnimationComplete={() => setBarDone(true)}
        >
          <span
            className="ml-auto pr-2.5 text-[13px] font-bold text-[#0A0A0A]"
            style={{ fontFamily: MONO }}
          >
            90% yours
          </span>
        </motion.div>
        <motion.div
          className="flex flex-1 items-center justify-center"
          initial={{ opacity: 0 }}
          animate={barDone ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <span
            className="text-[11px] font-semibold text-[#555555]"
            style={{ fontFamily: MONO }}
          >
            10%
          </span>
        </motion.div>
      </div>
      <p className="text-[13px] font-semibold text-white" style={{ fontFamily: MONO }}>
        {payoutText}
        <span className="ml-1.5 text-[11px] font-normal text-[#555555]">
          this month
        </span>
      </p>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    t: "Choose your challenge",
    d: "Six account sizes. $5K to $100K.",
    Visual: ChooseVisual,
  },
  {
    n: "02",
    t: "Prove your edge",
    d: "Live Kalshi prices. Hit your target.",
    Visual: ProveVisual,
  },
  {
    n: "03",
    t: "Get funded",
    d: "Real capital. Keep up to 90%.",
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
            className="flex min-w-0 flex-col gap-4 overflow-hidden rounded-2xl p-6 transition-[background-color,border-color] duration-150 ease-out hover:border-[#2C2C2C] hover:bg-[#141414]"
            style={{
              background: "#111111",
              border: "0.5px solid #1C1C1C",
            }}
          >
            <StepBadge n={n} />
            <DemoZone>
              <Visual />
            </DemoZone>
            <div>
              <h3 className="text-lg font-semibold">{t}</h3>
              <p className="mt-1.5 text-[13px] text-[#888888]">{d}</p>
            </div>
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
