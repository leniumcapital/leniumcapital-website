"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useInView, useMotionValue, useTransform } from "framer-motion";
import {
  AddonRow,
  PricingTotalBar,
  TierPillGrid,
} from "@/components/pricing/ChallengePickerParts";
import { MarketCard } from "@/components/dashboard/MarketCard";
import { useMarketStore } from "@/stores/marketStore";
import type { DashboardEvent } from "@/lib/marketDetail";
import type { Market } from "@/stores/marketStore";
import {
  ADDONS,
  computePrice,
  getDefaultTier,
  getTierBySize,
  type AddonId,
} from "@/lib/pricing";
import { T } from "@/lib/tokens";

const DEMO_ADDON_IDS: AddonId[] = ["90split", "fastpayout"];

const DEMO_EVENTS: DashboardEvent[] = [
  {
    eventTicker: "demo-nba-lakers",
    seriesTicker: "KXNBA",
    title: "NBA · Lakers ML",
    category: "Sports",
    subCategory: "Basketball",
    closeTime: new Date(Date.now() + 86400000 * 14).toISOString(),
    totalVolume: 420_000,
    volume24h: 88_000,
    marketCount: 2,
    leaderTicker: "demo-nba-lakers-yes",
    outcomes: [
      {
        ticker: "demo-nba-lakers-yes",
        name: "Lakers",
        yesPrice: 62,
        volume: 210_000,
      },
    ],
  },
  {
    eventTicker: "demo-cpi",
    seriesTicker: "KXCPI",
    title: "CPI < 3.1%",
    category: "Economics",
    closeTime: new Date(Date.now() + 86400000 * 30).toISOString(),
    totalVolume: 310_000,
    volume24h: 52_000,
    marketCount: 1,
    leaderTicker: "demo-cpi-yes",
    outcomes: [
      {
        ticker: "demo-cpi-yes",
        name: "Yes",
        yesPrice: 44,
        volume: 310_000,
      },
    ],
  },
  {
    eventTicker: "demo-fed",
    seriesTicker: "KXFED",
    title: "Fed cut in June",
    category: "Politics",
    closeTime: new Date(Date.now() + 86400000 * 45).toISOString(),
    totalVolume: 580_000,
    volume24h: 120_000,
    marketCount: 1,
    leaderTicker: "demo-fed-yes",
    outcomes: [
      {
        ticker: "demo-fed-yes",
        name: "Yes",
        yesPrice: 71,
        volume: 580_000,
      },
    ],
  },
];

function demoMarketsFromEvents(events: DashboardEvent[]): Market[] {
  return events.flatMap((ev) =>
    ev.outcomes.map((o) => ({
      ticker: o.ticker,
      question: ev.title,
      category: ev.category,
      yesPrice: o.yesPrice,
      noPrice: 100 - o.yesPrice,
      volume: o.volume,
      volume24h: ev.volume24h,
      expiry: ev.closeTime,
      priceHistory: [],
      sparklineData: [],
      open24h: o.yesPrice,
    })),
  );
}

/** Step 01 — live tier + add-on picker (shared with /pricing). */
export function TierSelectorDemo() {
  const [selectedSize, setSelectedSize] = useState(getDefaultTier().size);
  const [selectedAddons, setSelectedAddons] = useState<AddonId[]>(["90split"]);

  const tier = getTierBySize(selectedSize) ?? getDefaultTier();
  const price = useMemo(
    () => computePrice(tier, selectedAddons),
    [tier, selectedAddons],
  );

  const toggleAddon = (id: AddonId) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const demoAddons = ADDONS.filter((a) => DEMO_ADDON_IDS.includes(a.id));

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">
        Account size
      </div>
      <TierPillGrid
        compact
        selectedSize={selectedSize}
        onSelect={setSelectedSize}
      />
      <div className="space-y-2 pt-1">
        {demoAddons.map((addon) => (
          <AddonRow
            key={addon.id}
            compact
            addon={addon}
            baseFee={tier.fee}
            selected={selectedAddons.includes(addon.id)}
            onToggle={() => toggleAddon(addon.id)}
          />
        ))}
      </div>
      <PricingTotalBar total={price.total} />
    </div>
  );
}

function DemoAccountStats({
  balance,
  pnlPct,
  drawdownPct,
}: {
  balance: number;
  pnlPct: number;
  drawdownPct: number;
}) {
  const stats = [
    { label: "Balance", value: `$${Math.round(balance).toLocaleString()}`, tone: T.textPrimary },
    {
      label: "P&L",
      value: `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%`,
      tone: pnlPct >= 0 ? T.green : T.red,
    },
    {
      label: "Drawdown",
      value: `${drawdownPct.toFixed(1)}%`,
      tone: drawdownPct > 5 ? T.amber : T.textPrimary,
    },
  ];

  return (
    <div
      style={{
        background: T.bgTertiary,
        border: T.hairline(),
        borderRadius: 10,
        padding: 14,
        fontFamily: T.font,
      }}
    >
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div
              style={{
                color: T.textMuted,
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                color: s.tone,
                fontSize: 13,
                fontWeight: 600,
                marginTop: 4,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Step 02 — real MarketCard rows with simulated price ticks. */
export function TradingDashboardDemo() {
  const [balance, setBalance] = useState(26_840);
  const [pnlPct, setPnlPct] = useState(7.4);
  const [drawdownPct, setDrawdownPct] = useState(2.1);

  useEffect(() => {
    const markets = demoMarketsFromEvents(DEMO_EVENTS);
    useMarketStore.getState().syncCatalogFromKalshi({
      events: DEMO_EVENTS,
      markets,
    });

    const interval = setInterval(() => {
      const store = useMarketStore.getState();
      let delta = 0;
      for (const ev of DEMO_EVENTS) {
        const ticker = ev.leaderTicker;
        const current = store.markets[ticker]?.yesPrice ?? ev.outcomes[0]?.yesPrice ?? 50;
        const shift = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 2) + 1);
        const next = Math.min(85, Math.max(15, current + shift));
        delta += shift;
        store.updatePrice({
          ticker,
          yesPrice: next,
          noPrice: 100 - next,
        });
      }
      setPnlPct((p) => Math.min(12, Math.max(4, p + delta * 0.04)));
      setBalance((b) => b + delta * 18);
      setDrawdownPct((d) => Math.min(4.5, Math.max(1.2, d - delta * 0.015)));
    }, 3200);

    return () => {
      clearInterval(interval);
      useMarketStore.getState().reset();
    };
  }, []);

  return (
    <div className="space-y-3">
      <DemoAccountStats
        balance={balance}
        pnlPct={pnlPct}
        drawdownPct={drawdownPct}
      />
      <div className="space-y-2">
        {DEMO_EVENTS.map((ev) => (
          <MarketCard
            key={ev.eventTicker}
            eventTicker={ev.eventTicker}
            variant="row"
            interactive={false}
          />
        ))}
      </div>
    </div>
  );
}

/** Step 03 — animated payout approval card. */
export function PayoutApprovedDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const amount = useMotionValue(0);
  const display = useTransform(amount, (v) =>
    v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  );
  const [headline, setHeadline] = useState("0.00");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(amount, 4182, { duration: 0.7, ease: "easeOut" });
    const unsub = display.on("change", (v) => setHeadline(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, amount, display]);

  return (
    <div ref={ref} className="space-y-4">
      <div className="rounded-xl border border-brand/40 bg-brand-soft p-4">
        <div className="text-xs font-medium text-brand-strong">Payout approved</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-brand-strong">
          ${headline}
        </div>
        <div className="text-xs text-brand-strong/80">
          90% split · ACH to •••• 4471
        </div>
      </div>
      <div className="space-y-2 text-sm">
        {[
          ["Gross profit", "$4,646.67"],
          ["Your split (90%)", "$4,182.00"],
          ["Processing", "7 business days"],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <span className="text-muted">{label}</span>
            <span className="font-medium tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Payout speed comparison bars for the payouts section. */
export function PayoutSpeedComparison() {
  return (
    <div className="mt-6 space-y-2">
      <PayoutSpeedBar
        label="Standard"
        days="7 business days"
        widthPct={100}
        filled={false}
      />
      <PayoutSpeedBar
        label="Fast payout add-on"
        days="3 business days"
        widthPct={43}
        filled
      />
    </div>
  );
}

function PayoutSpeedBar({
  label,
  days,
  widthPct,
  filled,
}: {
  label: string;
  days: string;
  widthPct: number;
  filled: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className={`font-semibold ${filled ? "text-brand" : ""}`}>{days}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#161616]">
        <div
          className={`h-full rounded-full ${filled ? "bg-brand" : "bg-[#2C2C2C]"}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}
