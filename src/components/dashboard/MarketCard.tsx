"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useSpring, useTransform } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { useMarketStore, type PricePoint } from "@/stores/marketStore";
import { useUiStore } from "@/stores/uiStore";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { compactUsd } from "@/lib/data";
import { T } from "@/lib/tokens";

/**
 * Flash state for live price changes: snaps to green/red when the price
 * moves, then fades back to white over 600ms. The pending timeout is held
 * in the effect closure so a newer update always cancels the older reset.
 */
function usePriceFlash(yesPrice: number): string | null {
  const [prevPrice, setPrevPrice] = useState(yesPrice);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  // Adjust-state-during-render (guarded) — the recommended pattern for
  // reacting to a changed subscription value without effect cascades.
  if (prevPrice !== yesPrice) {
    setPrevPrice(yesPrice);
    setFlashColor(yesPrice > prevPrice ? T.green : T.red);
  }

  useEffect(() => {
    if (flashColor == null) return;
    const timeout = setTimeout(() => setFlashColor(null), 600);
    return () => clearTimeout(timeout);
  }, [flashColor, yesPrice]);

  return flashColor;
}

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

function formatExpiry(expiry: string): string {
  if (!expiry) return "";
  const d = new Date(expiry);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
      };
    }),
  );
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  useRealSparkline(ticker);

  const flashColor = usePriceFlash(market?.yesPrice ?? 0);

  const spring = useSpring(market?.yesPrice ?? 0, {
    stiffness: 120,
    damping: 22,
  });
  const display = useTransform(spring, (v) => `${Math.round(v)}`);
  useEffect(() => {
    if (market) spring.set(market.yesPrice);
  }, [market, spring]);

  const openDetail = () => {
    // Remember where the grid was so back-navigation restores the position.
    const main = document.getElementById("lenium-main");
    if (main) useUiStore.getState().setMarketsScrollTop(main.scrollTop);
    router.push(`/dashboard/markets/${encodeURIComponent(ticker)}`);
  };

  // A card with no real data never renders — the grid filters these out,
  // and this guard covers transient store gaps.
  if (!market || market.yesPrice <= 0 || market.volume <= 0) return null;

  const expiryLabel = formatExpiry(market.expiry);
  // Show a sparkline only with real history — never a flat fake line.
  const hasSparkline = market.sparklineData.length >= 2;
  const up = hasSparkline && market.yesPrice >= market.sparklineData[0];

  if (variant === "row") {
    return (
      <div
        onClick={openDetail}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          height: 56,
          padding: "0 16px",
          background: T.bgSecondary,
          border: T.hairline(hovered ? T.borderHover : T.border),
          borderRadius: 10,
          cursor: "pointer",
          transition: `border-color ${T.transition}`,
          fontFamily: T.font,
        }}
      >
        <span style={{ color: T.textMuted, fontSize: 11, minWidth: 72 }}>
          {market.category}
        </span>
        <span
          title={market.question}
          style={{
            flex: 1,
            color: "#CCCCCC",
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
        {hasSparkline && (
          <Sparkline data={market.sparklineData} up={up} width={64} height={22} />
        )}
        <motion.span
          animate={{ color: flashColor ?? T.textPrimary }}
          transition={{ duration: flashColor ? 0.05 : 0.6, ease: "easeOut" }}
          style={{
            color: T.textPrimary,
            fontSize: 16,
            fontWeight: 600,
            width: 48,
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {market.yesPrice}%
        </motion.span>
      </div>
    );
  }

  return (
    <div
      onClick={openDetail}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.bgSecondary,
        border: T.hairline(hovered ? T.borderHover : T.border),
        borderRadius: 10,
        padding: 16,
        cursor: "pointer",
        boxShadow: hovered ? "0 4px 20px rgba(0,0,0,0.5)" : "none",
        transition: `border-color ${T.transition}, box-shadow ${T.transition}`,
        fontFamily: T.font,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Row 1 — metadata: plain muted text, no pills, no icons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 400 }}>
          {market.category}
        </span>
        <span style={{ fontSize: 11, color: T.textMuted }}>{expiryLabel}</span>
      </div>

      {/* Row 2 — question: secondary to the price */}
      <p
        title={market.question}
        style={{
          margin: "0 0 12px",
          color: "#CCCCCC",
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

      {/* Row 3 — price (dominant) + sparkline */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <motion.span
          animate={{ color: flashColor ?? T.textPrimary }}
          transition={{ duration: flashColor ? 0.05 : 0.6, ease: "easeOut" }}
          style={{
            color: T.textPrimary,
            fontSize: 28,
            fontWeight: 600,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <motion.span>{display}</motion.span>%
        </motion.span>
        {hasSparkline && (
          <Sparkline data={market.sparklineData} up={up} width={80} height={28} />
        )}
      </div>

      {/* Row 4 — volume + compact YES/NO pills */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: T.textMuted, fontSize: 12 }}>
          {compactUsd(market.volume)} vol
        </span>
        <div style={{ display: "flex", gap: 5 }}>
          <span
            style={{
              background: "rgba(0,232,122,0.08)",
              border: "0.5px solid rgba(0,232,122,0.2)",
              color: T.green,
              fontSize: 11,
              borderRadius: 4,
              padding: "2px 7px",
            }}
          >
            YES {market.yesPrice}¢
          </span>
          <span
            style={{
              background: "rgba(255,255,255,0.04)",
              border: T.hairline(),
              color: T.textMuted,
              fontSize: 11,
              borderRadius: 4,
              padding: "2px 7px",
            }}
          >
            NO {market.noPrice}¢
          </span>
        </div>
      </div>
    </div>
  );
}

/** Shimmer placeholder shown while market data loads. */
export function SkeletonCard() {
  return (
    <div
      style={{
        background: T.bgSecondary,
        border: T.hairline(),
        borderRadius: 10,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div className="lenium-skeleton" style={{ width: "45%", height: 12 }} />
      <div className="lenium-skeleton" style={{ width: "100%", height: 36 }} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div className="lenium-skeleton" style={{ width: 64, height: 26 }} />
        <div className="lenium-skeleton" style={{ width: 80, height: 20 }} />
      </div>
    </div>
  );
}

/** Re-render only when this card's ticker or variant changes; the store
 *  selector handles price-level granularity internally. */
export const MarketCard = React.memo(
  MarketCardInner,
  (prev, next) => prev.ticker === next.ticker && prev.variant === next.variant,
);
