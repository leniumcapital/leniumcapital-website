"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FALLBACK_TICKERS,
  categoryMeta,
  compactUsd,
  type TickerMarket,
} from "@/lib/data";

const ROW_CONFIG = [
  { dir: "left" as const, duration: 85 },
  { dir: "right" as const, duration: 104 },
  { dir: "left" as const, duration: 94 },
  { dir: "right" as const, duration: 114 },
];

// Card width (270px) + row gap (16px).
const CARD_PX = 286;
// Each marquee half must span the widest realistic viewport so rows are
// fully populated on first paint — no blank space waiting to be filled.
const MIN_HALF_PX = 2800;

export function MarketTickers() {
  const [markets, setMarkets] = useState<TickerMarket[]>(FALLBACK_TICKERS);
  const [dirs, setDirs] = useState<Record<string, 1 | -1 | 0>>({});
  const [active, setActive] = useState<Record<string, "yes" | "no">>({});
  const prevYes = useRef<Record<string, number>>({});

  // Poll the live Kalshi feed (server route handles fetching + fallback).
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const res = await fetch("/api/markets", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { markets?: TickerMarket[] };
        if (!alive || !Array.isArray(data.markets) || !data.markets.length) return;

        setDirs((prev) => {
          const next = { ...prev };
          for (const m of data.markets!) {
            const p = prevYes.current[m.id];
            next[m.id] = p == null ? 0 : m.yes > p ? 1 : m.yes < p ? -1 : 0;
            prevYes.current[m.id] = m.yes;
          }
          return next;
        });
        setMarkets(data.markets);
      } catch {
        /* keep showing whatever we have */
      }
    };

    load();
    const t = setInterval(load, 6000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const onTrade = (id: string, side: "yes" | "no") => {
    setActive((a) => ({ ...a, [id]: side }));
  };

  const rows = useMemo(() => {
    const list = markets.length ? markets : FALLBACK_TICKERS;
    const per = Math.max(1, Math.ceil(list.length / ROW_CONFIG.length));
    return ROW_CONFIG.map((cfg, i) => {
      const cards = list.slice(i * per, (i + 1) * per);
      if (cards.length === 0) return { ...cfg, cards };
      // Tile the cards until one half of the marquee covers the viewport,
      // so the row is full edge-to-edge from the first frame.
      const copies = Math.max(1, Math.ceil(MIN_HALF_PX / (cards.length * CARD_PX)));
      return {
        ...cfg,
        cards: Array.from({ length: copies }, () => cards).flat(),
      };
    }).filter((r) => r.cards.length > 0);
  }, [markets]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between pt-20 pb-4 opacity-[0.82] sm:pt-24 sm:pb-6">
      {rows.map((row, i) => (
        <div key={i} className="marquee-row marquee-mask overflow-hidden">
          <div
            className="marquee-track gap-4 px-2"
            style={{
              animation: `marquee-${row.dir} ${row.duration}s linear infinite`,
            }}
          >
            {[...row.cards, ...row.cards].map((m, idx) => (
              <TickerCard
                key={`${i}-${m.id}-${idx}`}
                market={m}
                dir={dirs[m.id] ?? 0}
                active={active[m.id] ?? null}
                onTrade={onTrade}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TickerCard({
  market,
  dir,
  active,
  onTrade,
}: {
  market: TickerMarket;
  dir: 1 | -1 | 0;
  active: "yes" | "no" | null;
  onTrade: (id: string, side: "yes" | "no") => void;
}) {
  const meta = categoryMeta(market.category);
  const yes = market.yes;
  const no = 100 - yes;
  const yesMult = (100 / Math.max(1, yes)).toFixed(2);
  const noMult = (100 / Math.max(1, no)).toFixed(2);

  return (
    <div className="pointer-events-auto w-[270px] shrink-0 rounded-2xl border border-white/[0.07] bg-[#0b0e13]/70 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors hover:border-white/15">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <MarketIcon
            image={market.image}
            emoji={meta.emoji}
            color={market.color || meta.color}
          />
          <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-white/70">
            {market.category}
          </span>
        </div>
        <span className="shrink-0 text-[11px] text-white/40">Kalshi</span>
      </div>

      <div className="mt-3 line-clamp-2 text-sm font-medium leading-snug text-white/90">
        {market.title}
      </div>
      <div className="mt-0.5 text-[11px] text-white/40">
        {market.closes ? `Closes ${market.closes}` : "\u00A0"}
      </div>

      <div className="mt-3 space-y-2">
        <OutcomeRow
          label="Yes"
          tone="yes"
          pct={yes}
          mult={yesMult}
          dir={dir}
          active={active === "yes"}
          onClick={() => onTrade(market.id, "yes")}
        />
        <OutcomeRow
          label="No"
          tone="no"
          pct={no}
          mult={noMult}
          dir={0}
          active={active === "no"}
          onClick={() => onTrade(market.id, "no")}
        />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2 text-[11px] text-white/40">
        <span>{compactUsd(market.vol)} vol</span>
        <span>
          {market.markets} {market.markets === 1 ? "market" : "markets"}
        </span>
      </div>
    </div>
  );
}

function MarketIcon({
  image,
  emoji,
  color,
}: {
  image?: string;
  emoji: string;
  color: string;
}) {
  const [failed, setFailed] = useState(false);

  if (image && !failed) {
    return (
      <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-md bg-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt=""
          width={24}
          height={24}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-6 object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className="grid size-6 shrink-0 place-items-center rounded-md text-[12px]"
      style={{ backgroundColor: color }}
    >
      {emoji}
    </span>
  );
}

function OutcomeRow({
  label,
  tone,
  pct,
  mult,
  dir,
  active,
  onClick,
}: {
  label: string;
  tone: "yes" | "no";
  pct: number;
  mult: string;
  dir: 1 | -1 | 0;
  active: boolean;
  onClick: () => void;
}) {
  const isYes = tone === "yes";
  const underline = isYes ? "border-emerald-400/60" : "border-rose-400/60";

  const pill = active
    ? isYes
      ? "border-emerald-400 bg-emerald-400 text-[#04130b]"
      : "border-rose-400 bg-rose-400 text-[#1a0509]"
    : isYes
      ? "border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10"
      : "border-rose-400/40 text-rose-300 hover:bg-rose-400/10";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group/row flex w-full items-center justify-between gap-3 rounded-lg outline-none"
    >
      <span className={`border-b pb-0.5 text-sm text-white/85 ${underline}`}>
        {label}
      </span>
      <span className="flex items-center gap-2">
        {isYes && dir !== 0 && (
          <span
            className={`text-[10px] ${
              dir === 1 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {dir === 1 ? "▲" : "▼"}
          </span>
        )}
        <span className="font-mono text-xs text-white/45">{mult}x</span>
        <span
          className={`rounded-full border px-2.5 py-1 text-sm font-semibold transition-colors ${pill}`}
        >
          {pct}%
        </span>
      </span>
    </button>
  );
}
