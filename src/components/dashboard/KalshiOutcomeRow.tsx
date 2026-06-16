"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMarketStore } from "@/stores/marketStore";
import MarketOutcomeAvatar from "@/components/dashboard/MarketOutcomeAvatar";
import { formatMultiplier } from "@/lib/trendingLayout";
import { T } from "@/lib/tokens";

export type KalshiOutcomeRowProps = {
  name: string;
  category: string;
  ticker: string;
  yesPrice: number;
  imageUrl?: string | null;
  seriesTicker?: string | null;
  eventTitle?: string | null;
  isLeader?: boolean;
  compact?: boolean;
};

/** Kalshi-style outcome row — probability fill bar + avatar + multiplier + pill. */
export function KalshiOutcomeRow({
  name,
  category,
  ticker,
  yesPrice,
  imageUrl,
  seriesTicker,
  eventTitle,
  isLeader = false,
  compact = false,
}: KalshiOutcomeRowProps) {
  const livePrice = useMarketStore(
    (s) => s.markets[ticker]?.yesPrice ?? yesPrice,
  );
  const high = livePrice >= 70;
  const leader = isLeader || livePrice >= 70;
  const height = compact ? 34 : 38;

  const [flash, setFlash] = useState<string | null>(null);
  const prev = useRef(livePrice);

  useEffect(() => {
    if (prev.current !== livePrice) {
      setFlash(livePrice > prev.current ? T.green : T.red);
      prev.current = livePrice;
      const t = setTimeout(() => setFlash(null), 600);
      return () => clearTimeout(t);
    }
  }, [livePrice]);

  return (
    <div
      style={{
        position: "relative",
        height,
        borderRadius: 8,
        overflow: "hidden",
        border: T.hairline(leader ? "rgba(0,232,122,0.25)" : T.border),
        background: T.bgTertiary,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${Math.min(100, Math.max(0, livePrice))}%`,
          background: leader
            ? "rgba(0, 232, 122, 0.12)"
            : "rgba(255, 255, 255, 0.04)",
          transition: "width 300ms ease",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: "100%",
          padding: "0 10px",
          minWidth: 0,
        }}
      >
        <MarketOutcomeAvatar
          name={name}
          category={category}
          directUrl={imageUrl ?? null}
          marketTicker={ticker}
          seriesTicker={seriesTicker}
          eventTitle={eventTitle}
          size={compact ? 22 : 24}
        />

        <span
          title={name}
          style={{
            flex: 1,
            minWidth: 0,
            color: T.textPrimary,
            fontSize: compact ? 12 : 13,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </span>

        <span
          style={{
            color: T.textMuted,
            fontSize: 11,
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}
        >
          {formatMultiplier(livePrice)}
        </span>

        <motion.span
          animate={{ color: flash ?? (high ? T.green : T.textPrimary) }}
          transition={{ duration: flash ? 0.05 : 0.4 }}
          style={{
            background: high ? T.greenMutedBg : "#1A1A1A",
            border: high
              ? `0.5px solid ${T.greenMutedBorder}`
              : T.hairline("#2C2C2C"),
            borderRadius: 6,
            padding: compact ? "2px 8px" : "3px 10px",
            fontSize: compact ? 12 : 13,
            fontWeight: 600,
            minWidth: compact ? 38 : 44,
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}
        >
          {livePrice}%
        </motion.span>
      </div>
    </div>
  );
}
