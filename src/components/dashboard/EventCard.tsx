"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import { useMarketStore } from "@/stores/marketStore";
import { useUiStore } from "@/stores/uiStore";
import { useMinuteNow } from "@/hooks/useChallengeProgress";
import type { DashboardEvent, EventOutcome } from "@/lib/marketDetail";
import { T } from "@/lib/tokens";

const CATEGORY_COLORS: Record<string, string> = {
  Economics: "#3B82F6",
  Politics: "#8B5CF6",
  Sports: "#F59E0B",
  Crypto: "#EAB308",
  Culture: "#EC4899",
  Climate: "#10B981",
  "Science and Tech": "#06B6D4",
  Health: "#F43F5E",
};

function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? T.green;
}

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
    if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow @ ${time}`;
  }
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${date} @ ${time}`;
}

function formatVolume(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M vol`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K vol`;
  return `$${Math.round(n).toLocaleString()} vol`;
}

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
}

function EventCardInner({ eventTicker }: EventCardProps) {
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

  const accent = categoryColor(event.category);

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
        borderRadius: T.radiusLg,
        padding: 18,
        cursor: "pointer",
        minHeight: 220,
        transition: `border-color ${T.transition}`,
        fontFamily: T.font,
      }}
    >
      {/* Category badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 2,
            background: accent,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            color: T.textMuted,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {event.category}
        </span>
      </div>

      {/* Title */}
      <div
        title={event.title}
        style={{
          marginTop: 12,
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

      {/* Close time */}
      <div
        style={{
          marginTop: 6,
          color: T.textMuted,
          fontSize: 11,
          minHeight: 16,
        }}
      >
        {formatCloseTime(event.closeTime, now)}
      </div>

      {/* Outcome rows */}
      <div
        style={{
          marginTop: 14,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          flex: 1,
        }}
      >
        {event.outcomes.map((outcome) => (
          <OutcomeRow key={outcome.ticker} outcome={outcome} accent={accent} />
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: T.hairline(),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: T.textMuted,
          fontSize: 11,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>{formatVolume(event.totalVolume)}</span>
        <span>
          {event.marketCount} market{event.marketCount === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

function OutcomeRow({
  outcome,
  accent,
}: {
  outcome: EventOutcome;
  accent: string;
}) {
  const livePrice = useMarketStore(
    (s) => s.markets[outcome.ticker]?.yesPrice ?? outcome.yesPrice,
  );
  const multiplier = livePrice > 0 ? 100 / livePrice : 0;
  const flash = usePillFlash(livePrice);
  const highProb = livePrice >= 50;

  return (
    <div style={{ minWidth: 0 }}>
      <div
        title={outcome.name}
        style={{
          color: T.textPrimary,
          fontSize: 13,
          fontWeight: 500,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {outcome.name}
      </div>
      <div
        style={{
          marginTop: 6,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            height: 4,
            borderRadius: 2,
            background: T.bgTertiary,
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={false}
            animate={{ width: `${Math.min(100, Math.max(0, livePrice))}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 24 }}
            style={{
              height: "100%",
              background: accent,
              borderRadius: 2,
            }}
          />
        </div>
        <span
          style={{
            color: T.textMuted,
            fontSize: 12,
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
            minWidth: 36,
            textAlign: "right",
          }}
        >
          {multiplier >= 10 ? multiplier.toFixed(1) : multiplier.toFixed(2)}x
        </span>
        <motion.span
          animate={{
            color: flash ?? T.textPrimary,
            borderColor: flash ?? (highProb ? T.greenMutedBorder : T.borderHover),
          }}
          transition={{ duration: flash ? 0.05 : 0.6, ease: "easeOut" }}
          style={{
            border: `0.5px solid ${highProb ? T.greenMutedBorder : T.borderHover}`,
            borderRadius: T.radiusPill,
            padding: "3px 10px",
            background: T.bgTertiary,
            color: T.textPrimary,
            fontSize: 12,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
            minWidth: 44,
            textAlign: "center",
          }}
        >
          {livePrice}%
        </motion.span>
      </div>
    </div>
  );
}

export const EventCard = React.memo(
  EventCardInner,
  (prev, next) => prev.eventTicker === next.eventTicker,
);

export function SkeletonEventCard() {
  return (
    <div
      style={{
        background: T.bgSecondary,
        border: T.hairline(),
        borderRadius: T.radiusLg,
        padding: 18,
        minHeight: 220,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div className="lenium-skeleton" style={{ width: 90, height: 12 }} />
      <div className="lenium-skeleton" style={{ width: "90%", height: 18 }} />
      <div className="lenium-skeleton" style={{ width: "60%", height: 12 }} />
      <div className="lenium-skeleton" style={{ width: "100%", height: 32 }} />
      <div className="lenium-skeleton" style={{ width: "100%", height: 32 }} />
      <div style={{ flex: 1 }} />
      <div className="lenium-skeleton" style={{ width: "50%", height: 12 }} />
    </div>
  );
}
