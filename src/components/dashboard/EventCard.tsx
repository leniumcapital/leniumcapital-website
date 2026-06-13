"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import { useMarketStore } from "@/stores/marketStore";
import { useUiStore } from "@/stores/uiStore";
import { useMinuteNow } from "@/hooks/useChallengeProgress";
import { SeriesIcon, OutcomeAvatar } from "@/components/dashboard/KalshiImages";
import type { DashboardEvent, EventOutcome } from "@/lib/marketDetail";
import { T } from "@/lib/tokens";

/**
 * Kalshi-style event card: series icon + category label, event title, close
 * time, favored outcome rows (real Kalshi image, name, multiplier odds, live
 * percentage pill), and a footer with total volume and contract count.
 */

const UNDERLINE_COLORS = [T.green, "#3B82F6"] as const;

function formatCloseTime(iso: string, now: number): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(" ", "");
  if (now > 0) {
    const today = new Date(now);
    const tomorrow = new Date(now + 86_400_000);
    if (d.toDateString() === today.toDateString()) return `Today @ ${time}`;
    if (d.toDateString() === tomorrow.toDateString())
      return `Tomorrow @ ${time}`;
  }
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${date} @ ${time}`;
}

/** Flash state: snaps to green/red on price moves, fades back over 600ms. */
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

interface EventCardProps {
  eventTicker: string;
  variant?: "card" | "row";
}

function EventCardInner({ eventTicker, variant = "card" }: EventCardProps) {
  const event = useMarketStore(
    useShallow((s): DashboardEvent | null => s.events[eventTicker] ?? null),
  );
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const now = useMinuteNow();

  if (!event || event.outcomes.length === 0) return null;

  const openDetail = () => {
    const main = document.getElementById("lenium-main");
    if (main) useUiStore.getState().setMarketsScrollTop(main.scrollTop);
    router.push(`/dashboard/markets/${encodeURIComponent(event.leaderTicker)}`);
  };

  const closeMs = event.closeTime ? new Date(event.closeTime).getTime() : 0;
  // "Happening now" proxy: resolves within a few hours (live games, hourly
  // strikes), with grace after the expected end for overtime. Same-day
  // events get the "Today @ ..." label instead.
  const isLive =
    now > 0 &&
    closeMs > 0 &&
    closeMs - now < 4 * 3_600_000 &&
    now - closeMs < 3 * 3_600_000;

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
        <SeriesIcon
          seriesTicker={event.seriesTicker}
          category={event.category}
          title={event.title}
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
    <div
      onClick={openDetail}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        background: T.bgSecondary,
        border: T.hairline(hovered ? T.borderHover : T.border),
        borderRadius: 12,
        padding: 16,
        cursor: "pointer",
        minHeight: 196,
        boxShadow: hovered ? "0 4px 24px rgba(0,0,0,0.45)" : "none",
        transition: `border-color ${T.transition}, box-shadow ${T.transition}`,
        fontFamily: T.font,
      }}
    >
      {/* Header: series image + category label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <SeriesIcon
          seriesTicker={event.seriesTicker}
          category={event.category}
          title={event.title}
          size={26}
        />
        <span
          style={{
            color: T.textMuted,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {event.category}
        </span>
      </div>

      {/* Title */}
      <div
        title={event.title}
        style={{
          marginTop: 10,
          color: T.textPrimary,
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1.35,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {event.title}
      </div>

      {/* Close time / live row */}
      <div
        style={{
          marginTop: 6,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          color: T.textMuted,
          minHeight: 16,
        }}
      >
        {isLive && (
          <>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: T.red,
                flexShrink: 0,
              }}
            />
            <span style={{ color: T.red, fontWeight: 600, letterSpacing: "0.04em" }}>
              LIVE
            </span>
          </>
        )}
        <span>{formatCloseTime(event.closeTime, now)}</span>
      </div>

      {/* Favored outcome rows */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flex: 1,
        }}
      >
        {event.outcomes.map((outcome, i) => (
          <OutcomeRow
            key={outcome.ticker}
            outcome={outcome}
            category={event.category}
            index={i}
          />
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: T.textMuted,
          fontSize: 11,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>${Math.round(event.totalVolume).toLocaleString()} vol</span>
        <span>
          {event.marketCount} market{event.marketCount === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

function OutcomeRow({
  outcome,
  category,
  index,
}: {
  outcome: EventOutcome;
  category: string;
  index: number;
}) {
  const underline = UNDERLINE_COLORS[index % UNDERLINE_COLORS.length];

  // Live price from the streaming store, falling back to the snapshot.
  const livePrice = useMarketStore(
    (s) => s.markets[outcome.ticker]?.yesPrice ?? outcome.yesPrice,
  );
  const multiplier = livePrice > 0 ? 100 / livePrice : 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <OutcomeAvatar
        ticker={outcome.ticker}
        name={outcome.name}
        category={category}
        imageUrl={outcome.imageUrl}
        size={26}
        colorIndex={index}
      />

      <span
        title={outcome.name}
        style={{
          flex: 1,
          minWidth: 0,
          color: T.textPrimary,
          fontSize: 13,
          fontWeight: 500,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          paddingBottom: 3,
          borderBottom: `1.5px solid ${underline}`,
          alignSelf: "flex-start",
        }}
      >
        {outcome.name}
      </span>

      <span
        style={{
          color: T.textMuted,
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        {multiplier >= 10 ? multiplier.toFixed(1) : multiplier.toFixed(2)}x
      </span>

      <LivePricePill ticker={outcome.ticker} fallback={outcome.yesPrice} />
    </div>
  );
}

/** Percentage pill that flashes green/red when the live price changes. */
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
        borderColor: flash ?? "#2E4F3C",
      }}
      transition={{ duration: flash ? 0.05 : 0.6, ease: "easeOut" }}
      style={{
        border: "1px solid #2E4F3C",
        borderRadius: 999,
        padding: "4px 12px",
        color: T.textPrimary,
        fontSize: 13,
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        flexShrink: 0,
        lineHeight: 1.2,
      }}
    >
      {price}%
    </motion.span>
  );
}

export const EventCard = React.memo(
  EventCardInner,
  (prev, next) =>
    prev.eventTicker === next.eventTicker && prev.variant === next.variant,
);

/** Shimmer placeholder matching the event card footprint. */
export function SkeletonEventCard() {
  return (
    <div
      style={{
        background: T.bgSecondary,
        border: T.hairline(),
        borderRadius: 12,
        padding: 16,
        minHeight: 196,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div className="lenium-skeleton" style={{ width: 90, height: 14 }} />
      <div className="lenium-skeleton" style={{ width: "85%", height: 18 }} />
      <div className="lenium-skeleton" style={{ width: "70%", height: 26, borderRadius: 999 }} />
      <div className="lenium-skeleton" style={{ width: "70%", height: 26, borderRadius: 999 }} />
      <div style={{ flex: 1 }} />
      <div className="lenium-skeleton" style={{ width: "50%", height: 12 }} />
    </div>
  );
}
