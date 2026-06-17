"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMarketStore } from "@/stores/marketStore";
import MarketOutcomeAvatar from "@/components/dashboard/MarketOutcomeAvatar";
import { formatMultiplier } from "@/lib/trendingLayout";
import { T } from "@/lib/tokens";

/** Team/outcome accent underlines — Kalshi blue vs red for head-to-head. */
const OUTCOME_ACCENTS = ["#3B82F6", "#EF4444", "#00E87A", "#A855F7", "#F59E0B"];

export type KalshiOutcomeRowProps = {
  name: string;
  category: string;
  ticker: string;
  yesPrice: number;
  imageUrl?: string | null;
  seriesTicker?: string | null;
  eventTitle?: string | null;
  /** Row index for blue/red underline rotation. */
  index?: number;
  accentColor?: string;
};

/** Flat Kalshi outcome row: avatar, name + colored underline, multiplier, green-border pill. */
export function KalshiOutcomeRow({
  name,
  category,
  ticker,
  yesPrice,
  imageUrl,
  seriesTicker,
  eventTitle,
  index = 0,
  accentColor,
}: KalshiOutcomeRowProps) {
  const livePrice = useMarketStore(
    (s) => s.markets[ticker]?.yesPrice ?? yesPrice,
  );
  const underline = accentColor ?? OUTCOME_ACCENTS[index % OUTCOME_ACCENTS.length];

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
        display: "grid",
        gridTemplateColumns: "28px minmax(0, 1fr) auto auto",
        columnGap: 10,
        alignItems: "center",
        width: "100%",
        minWidth: 0,
        padding: "4px 0",
      }}
    >
      <MarketOutcomeAvatar
        name={name}
        category={category}
        directUrl={imageUrl ?? null}
        marketTicker={ticker}
        seriesTicker={seriesTicker}
        eventTitle={eventTitle}
        size={28}
      />

      <div style={{ minWidth: 0 }}>
        <div
          title={name}
          style={{
            color: T.textPrimary,
            fontSize: 14,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.2,
          }}
        >
          {name}
        </div>
        <div
          style={{
            marginTop: 5,
            width: 56,
            height: 2,
            borderRadius: 1,
            background: underline,
          }}
        />
      </div>

      <span
        style={{
          color: T.textSecondary,
          fontSize: 13,
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
          paddingRight: 4,
        }}
      >
        {formatMultiplier(livePrice)}
      </span>

      <motion.span
        animate={{
          color: flash ?? T.textPrimary,
          borderColor: flash ?? T.greenMutedBorder,
        }}
        transition={{ duration: flash ? 0.05 : 0.4 }}
        style={{
          border: `1px solid ${T.greenMutedBorder}`,
          borderRadius: 999,
          padding: "5px 12px",
          background: "transparent",
          fontSize: 14,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          minWidth: 52,
          textAlign: "center",
          flexShrink: 0,
          lineHeight: 1.2,
        }}
      >
        {livePrice}%
      </motion.span>
    </div>
  );
}
