"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import { useMarketStore } from "@/stores/marketStore";
import { useUiStore } from "@/stores/uiStore";
import { KalshiEventCard } from "@/components/dashboard/KalshiEventCard";
import { seriesIconDirectUrl } from "@/lib/seriesIcon";
import MarketOutcomeAvatar from "@/components/dashboard/MarketOutcomeAvatar";
import type { DashboardEvent } from "@/lib/marketDetail";
import { MARKET_CARD_MIN_HEIGHT } from "@/lib/marketGrid";
import { T } from "@/lib/tokens";

const PILL_MIN_WIDTH = 52;

function usePillFlash(price: number): string | null {
  const [prevPrice, setPrevPrice] = useState(price);
  const [flash, setFlash] = useState<string | null>(null);
  if (prevPrice !== price) {
    setPrevPrice(price);
    setFlash(price > prevPrice ? T.green : T.red);
  }
  useEffect(() => {
    if (flash == null) return;
    const timeout = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(timeout);
  }, [flash, price]);
  return flash;
}

export interface MarketCardProps {
  eventTicker: string;
  variant?: "card" | "row";
}

function MarketCardInner({ eventTicker, variant = "card" }: MarketCardProps) {
  const event = useMarketStore(
    useShallow((s): DashboardEvent | null => s.events[eventTicker] ?? null),
  );
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  if (!event || event.outcomes.length === 0) return null;

  const openDetail = () => {
    const main = document.getElementById("lenium-main");
    if (main) useUiStore.getState().setMarketsScrollTop(main.scrollTop);
    router.push(`/dashboard/markets/${encodeURIComponent(event.leaderTicker)}`);
  };

  if (variant === "row") {
    const top = event.outcomes[0];
    return (
      <div
        onClick={openDetail}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
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
        <MarketOutcomeAvatar
          name={event.title}
          category={event.category}
          directUrl={seriesIconDirectUrl(event.seriesTicker)}
          marketTicker={event.leaderTicker}
          seriesTicker={event.seriesTicker}
          eventTitle={event.title}
          size={24}
        />
        <span
          title={event.title}
          style={{
            flex: 1,
            minWidth: 0,
            color: T.textPrimary,
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {event.title}
        </span>
        <span
          style={{
            color: T.textMuted,
            fontSize: 12,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 160,
          }}
        >
          {top.name}
        </span>
        <LivePricePill ticker={top.ticker} fallback={top.yesPrice} />
        <span
          style={{
            color: T.textMuted,
            fontSize: 11,
            minWidth: 64,
            textAlign: "right",
          }}
        >
          {event.marketCount} mkts
        </span>
      </div>
    );
  }

  return (
    <KalshiEventCard
      event={event}
      hovered={hovered}
      onHover={setHovered}
      maxOutcomes={2}
      fillHeight
    />
  );
}

function LivePricePill({
  ticker,
  fallback,
}: {
  ticker: string;
  fallback: number;
}) {
  const price = useMarketStore((s) => s.markets[ticker]?.yesPrice ?? fallback);
  const flash = usePillFlash(price);

  return (
    <motion.span
      animate={{
        color: flash ?? T.textPrimary,
        borderColor: flash ?? T.greenMutedBorder,
      }}
      transition={{ duration: flash ? 0.05 : 0.6, ease: "easeOut" }}
      style={{
        border: `1px solid ${T.greenMutedBorder}`,
        borderRadius: 999,
        padding: "4px 10px",
        color: T.textPrimary,
        fontSize: 13,
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        flexShrink: 0,
        lineHeight: 1.2,
        minWidth: PILL_MIN_WIDTH,
        textAlign: "center",
        whiteSpace: "nowrap",
        background: "transparent",
      }}
    >
      {price}%
    </motion.span>
  );
}

export const MarketCard = React.memo(
  MarketCardInner,
  (prev, next) =>
    prev.eventTicker === next.eventTicker && prev.variant === next.variant,
);

export function SkeletonMarketCard() {
  return (
    <div
      style={{
        background: T.bgSecondary,
        border: T.hairline(),
        borderRadius: 12,
        padding: 16,
        minHeight: MARKET_CARD_MIN_HEIGHT,
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <div className="lenium-skeleton" style={{ width: 28, height: 28, borderRadius: 8 }} />
        <div className="lenium-skeleton" style={{ width: 72, height: 14 }} />
      </div>
      <div className="lenium-skeleton" style={{ width: "85%", height: 18 }} />
      <div className="lenium-skeleton" style={{ width: "45%", height: 12 }} />
      <div className="lenium-skeleton" style={{ width: "100%", height: 36, borderRadius: 8 }} />
      <div className="lenium-skeleton" style={{ width: "100%", height: 36, borderRadius: 8 }} />
      <div style={{ flex: 1 }} />
      <div className="lenium-skeleton" style={{ width: "50%", height: 12 }} />
    </div>
  );
}
