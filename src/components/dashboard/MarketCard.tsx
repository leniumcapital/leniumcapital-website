"use client";

import React, { useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  useSpring,
  useTransform,
} from "framer-motion";
import { IconClock } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { useMarketStore, type PricePoint } from "@/stores/marketStore";
import { useUiStore } from "@/stores/uiStore";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { compactUsd } from "@/lib/data";
import { T } from "@/lib/tokens";

interface MarketCardProps {
  ticker: string;
  /** Compact horizontal row instead of card (list view). */
  variant?: "card" | "row";
}

// ── Throttled real-history loader ────────────────────────────────────────────
// Each visible card fetches its real 24h candlesticks once. A small semaphore
// keeps the burst gentle on Kalshi when many cards mount at the same time.

const MAX_CONCURRENT_HISTORY = 4;
let activeFetches = 0;
const waiters: (() => void)[] = [];

async function acquire(): Promise<void> {
  if (activeFetches < MAX_CONCURRENT_HISTORY) {
    activeFetches++;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  activeFetches++;
}

function release(): void {
  activeFetches--;
  waiters.shift()?.();
}

/** Fetch + seed the real 24h price history for a market, once per session. */
export function useRealSparkline(ticker: string): void {
  const historyLoaded = useMarketStore(
    (s) => s.markets[ticker]?.historyLoaded ?? false,
  );

  const { data } = useQuery({
    queryKey: ["sparkline", ticker],
    enabled: !historyLoaded,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async (): Promise<PricePoint[]> => {
      await acquire();
      try {
        const res = await fetch(
          `/api/kalshi/history/${encodeURIComponent(ticker)}?range=1D`,
          { cache: "no-store" },
        );
        if (!res.ok) return [];
        const json = (await res.json()) as { points?: PricePoint[] };
        return json.points ?? [];
      } finally {
        release();
      }
    },
  });

  useEffect(() => {
    if (data) {
      useMarketStore.getState().seedSparklineFromHistory(ticker, data);
    }
  }, [data, ticker]);
}

function formatExpiry(expiry: string): { label: string; within24h: boolean } {
  if (!expiry) return { label: "—", within24h: false };
  const d = new Date(expiry);
  if (Number.isNaN(d.getTime())) return { label: "—", within24h: false };
  return {
    label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    within24h: d.getTime() - Date.now() < 86_400_000,
  };
}

function MarketCardInner({ ticker, variant = "card" }: MarketCardProps) {
  // Subscribe ONLY to this market's slice — other markets never re-render us.
  const market = useMarketStore(
    useShallow((s) => {
      const m = s.markets[ticker];
      if (!m) return null;
      return {
        question: m.question,
        category: m.category,
        yesPrice: m.yesPrice,
        noPrice: m.noPrice,
        volume: m.volume,
        expiry: m.expiry,
        sparklineData: m.sparklineData,
        open24h: m.open24h,
        historyLoaded: m.historyLoaded ?? false,
      };
    }),
  );
  const openDrawer = useUiStore((s) => s.openDrawer);
  const [hovered, setHovered] = useState(false);

  useRealSparkline(ticker);

  const spring = useSpring(market?.yesPrice ?? 0, {
    stiffness: 120,
    damping: 22,
  });
  const display = useTransform(spring, (v) => `${Math.round(v)}`);
  useEffect(() => {
    if (market) spring.set(market.yesPrice);
  }, [market, spring]);

  if (!market || market.yesPrice <= 0) {
    return <SkeletonCard variant={variant} />;
  }

  const expiry = formatExpiry(market.expiry);
  const hasSparkline = market.sparklineData.length >= 2;
  const up =
    market.yesPrice >= (hasSparkline ? market.sparklineData[0] : market.open24h);

  if (variant === "row") {
    return (
      <div
        onClick={() => openDrawer(ticker)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          height: 56,
          padding: "0 18px",
          background: T.bgSecondary,
          border: T.hairline(hovered ? T.borderHover : T.border),
          borderRadius: 10,
          cursor: "pointer",
          transition: `border-color ${T.transition}`,
          fontFamily: T.font,
        }}
      >
        <CategoryPill category={market.category} />
        <span
          title={market.question}
          style={{
            flex: 1,
            color: T.textPrimary,
            fontSize: 13,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {market.question}
        </span>
        <span style={{ color: T.textMuted, fontSize: 12 }}>
          {compactUsd(market.volume)} vol
        </span>
        {hasSparkline ? (
          <Sparkline data={market.sparklineData} up={up} width={64} height={22} />
        ) : (
          <span className="lenium-skeleton" style={{ width: 64, height: 22 }} />
        )}
        <span
          style={{
            color: T.textPrimary,
            fontSize: 16,
            fontWeight: 500,
            width: 48,
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {market.yesPrice}%
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={() => openDrawer(ticker)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        background: T.bgSecondary,
        border: T.hairline(hovered ? T.borderHover : T.border),
        borderRadius: 10,
        padding: "16px 18px",
        cursor: "pointer",
        boxShadow: hovered ? "0 2px 16px rgba(0,0,0,0.5)" : "none",
        transition: `border-color ${T.transition}, box-shadow ${T.transition}`,
        fontFamily: T.font,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top row: category + expiry */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <CategoryPill category={market.category} />
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <IconClock
            size={11}
            color={expiry.within24h ? T.amber : T.textMuted}
            stroke={1.5}
          />
          <span
            style={{
              color: expiry.within24h ? T.amber : T.textMuted,
              fontSize: 11,
            }}
          >
            {expiry.label}
          </span>
        </div>
      </div>

      {/* Question */}
      <p
        title={market.question}
        style={{
          marginTop: 10,
          marginBottom: 0,
          color: T.textPrimary,
          fontSize: 13,
          lineHeight: 1.5,
          fontWeight: 400,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          minHeight: "2.9em",
        }}
      >
        {market.question}
      </p>

      {/* Price + sparkline */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            color: T.textPrimary,
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <motion.span>{display}</motion.span>%
        </span>
        {hasSparkline ? (
          <Sparkline data={market.sparklineData} up={up} width={72} height={24} />
        ) : (
          <span className="lenium-skeleton" style={{ width: 72, height: 24 }} />
        )}
      </div>

      {/* Volume + YES/NO pills */}
      <div
        style={{
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: T.textMuted, fontSize: 12 }}>
          {compactUsd(market.volume)} vol
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <span
            style={{
              background: "rgba(0,232,122,0.08)",
              border: T.hairline(T.greenMutedBorder),
              color: T.green,
              fontSize: 11,
              borderRadius: 4,
              padding: "2px 8px",
            }}
          >
            YES {market.yesPrice}¢
          </span>
          <span
            style={{
              background: T.bgTertiary,
              border: T.hairline(),
              color: T.textMuted,
              fontSize: 11,
              borderRadius: 4,
              padding: "2px 8px",
            }}
          >
            NO {market.noPrice}¢
          </span>
        </div>
      </div>

      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              bottom: 14,
              right: 18,
              color: T.green,
              fontSize: 12,
              background: T.bgSecondary,
              paddingLeft: 8,
            }}
          >
            Trade →
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryPill({ category }: { category: string }) {
  return (
    <span
      style={{
        background: T.bgTertiary,
        border: T.hairline(),
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 11,
        color: T.textMuted,
        whiteSpace: "nowrap",
      }}
    >
      {category}
    </span>
  );
}

/** Shimmer placeholder shown until real price data exists for the slot. */
export function SkeletonCard({ variant = "card" }: { variant?: "card" | "row" }) {
  if (variant === "row") {
    return (
      <div
        className="lenium-skeleton"
        style={{ height: 56, borderRadius: 10 }}
      />
    );
  }
  return (
    <div
      style={{
        background: T.bgSecondary,
        border: T.hairline(),
        borderRadius: 10,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div className="lenium-skeleton" style={{ width: 80, height: 18 }} />
      <div className="lenium-skeleton" style={{ width: "100%", height: 36 }} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div className="lenium-skeleton" style={{ width: 64, height: 28 }} />
        <div className="lenium-skeleton" style={{ width: 72, height: 24 }} />
      </div>
      <div className="lenium-skeleton" style={{ width: "60%", height: 16 }} />
    </div>
  );
}

/** Re-render only when this card's ticker or variant changes; the store
 *  selector handles price-level granularity internally. */
export const MarketCard = React.memo(
  MarketCardInner,
  (prev, next) => prev.ticker === next.ticker && prev.variant === next.variant,
);
