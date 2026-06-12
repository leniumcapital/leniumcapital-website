"use client";

import React, { useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  useSpring,
  useTransform,
} from "framer-motion";
import { IconClock } from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";
import { useMarketStore } from "@/stores/marketStore";
import { useUiStore } from "@/stores/uiStore";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { compactUsd } from "@/lib/data";
import { T } from "@/lib/tokens";

interface MarketCardProps {
  ticker: string;
  /** Compact horizontal row instead of card (list view). */
  variant?: "card" | "row";
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
      };
    }),
  );
  const openDrawer = useUiStore((s) => s.openDrawer);
  const [hovered, setHovered] = useState(false);

  const spring = useSpring(market?.yesPrice ?? 0, {
    stiffness: 120,
    damping: 22,
  });
  const display = useTransform(spring, (v) => `${Math.round(v)}`);
  useEffect(() => {
    if (market) spring.set(market.yesPrice);
  }, [market, spring]);

  if (!market) return null;

  const expiry = formatExpiry(market.expiry);
  const up = market.yesPrice >= market.open24h;

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
          margin: "4px 24px",
          padding: "0 16px",
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
        <Sparkline data={market.sparklineData} up={up} width={64} height={22} />
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
        padding: 20,
        cursor: "pointer",
        height: "100%",
        boxShadow: hovered ? "0 4px 24px rgba(0,0,0,0.4)" : "none",
        transition: `border-color ${T.transition}, box-shadow ${T.transition}`,
        fontFamily: T.font,
        display: "flex",
        flexDirection: "column",
      }}
    >
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
            size={12}
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

      <p
        title={market.question}
        style={{
          marginTop: 12,
          marginBottom: 0,
          color: T.textPrimary,
          fontSize: 14,
          lineHeight: 1.5,
          fontWeight: 400,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {market.question}
      </p>

      <div
        style={{
          marginTop: "auto",
          paddingTop: 14,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            color: T.textPrimary,
            fontSize: 26,
            fontWeight: 500,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <motion.span>{display}</motion.span>%
        </span>
        <Sparkline data={market.sparklineData} up={up} />
      </div>

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
              background: T.greenMutedBg,
              border: T.hairline(T.greenMutedBorder),
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

      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              bottom: 16,
              right: 16,
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
        background: "rgba(255,255,255,0.04)",
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

/** Re-render only when this card's ticker or variant changes; the store
 *  selector handles price-level granularity internally. */
export const MarketCard = React.memo(
  MarketCardInner,
  (prev, next) => prev.ticker === next.ticker && prev.variant === next.variant,
);
