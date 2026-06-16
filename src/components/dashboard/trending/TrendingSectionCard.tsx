"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useMarketStore } from "@/stores/marketStore";
import { useUiStore } from "@/stores/uiStore";
import { useMinuteNow } from "@/hooks/useChallengeProgress";
import MarketOutcomeAvatar from "@/components/dashboard/MarketOutcomeAvatar";
import type { DashboardEvent } from "@/lib/marketDetail";
import {
  formatCloseLabel,
  formatMultiplier,
  formatVolShort,
  isEventLive,
  seriesDisplayName,
} from "@/lib/trendingLayout";
import { T } from "@/lib/tokens";

export function LazyTrendingCard({
  eventTicker,
  children,
}: {
  eventTicker: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible ? (
        children
      ) : (
        <div
          className="lenium-skeleton"
          style={{ height: 140, borderRadius: 10 }}
        />
      )}
    </div>
  );
}

export function TrendingSectionCard({ eventTicker }: { eventTicker: string }) {
  const event = useMarketStore((s) => s.events[eventTicker]);
  const router = useRouter();
  const now = useMinuteNow();
  const [hovered, setHovered] = useState(false);

  if (!event || event.outcomes.length === 0) return null;

  const openDetail = () => {
    const main = document.getElementById("lenium-main");
    if (main) useUiStore.getState().setMarketsScrollTop(main.scrollTop);
    router.push(`/dashboard/markets/${encodeURIComponent(event.leaderTicker)}`);
  };

  const live = isEventLive(event.closeTime, now);
  const seriesLabel = seriesDisplayName(event.seriesTicker, event);
  const outcomes = event.outcomes.slice(0, 2);

  return (
    <div
      onClick={openDetail}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#161616" : T.bgSecondary,
        border: T.hairline(hovered ? T.borderHover : T.border),
        borderRadius: 10,
        padding: "14px 16px",
        cursor: "pointer",
        transition: `all 150ms ease`,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        fontFamily: T.font,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <CategoryBadge label={event.category} />
        <span style={{ color: T.textMuted, fontSize: 10 }}>{seriesLabel}</span>
      </div>

      <div>
        <div
          title={event.title}
          style={{
            color: T.textPrimary,
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {event.title}
        </div>
        <div
          style={{
            marginTop: 4,
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: T.textMuted,
            fontSize: 11,
          }}
        >
          {live && (
            <>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.red }} />
              <span style={{ color: T.red, fontWeight: 600 }}>LIVE</span>
            </>
          )}
          <span>{formatCloseLabel(event.closeTime, now)}</span>
        </div>
      </div>

      {outcomes.map((o) => (
        <OutcomeCompactRow key={o.ticker} outcome={o} event={event} />
      ))}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: T.textMuted,
          fontSize: 11,
        }}
      >
        <span>{formatVolShort(event.totalVolume)} vol</span>
        <span>
          {event.marketCount === 1
            ? `Spread and Total · 1 market`
            : `${event.marketCount} markets`}
        </span>
      </div>
    </div>
  );
}

function CategoryBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        background: T.greenMutedBg,
        border: `0.5px solid ${T.greenMutedBorder}`,
        color: T.green,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "2px 8px",
        borderRadius: 4,
      }}
    >
      {label}
    </span>
  );
}

function OutcomeCompactRow({
  outcome,
  event,
}: {
  outcome: DashboardEvent["outcomes"][0];
  event: DashboardEvent;
}) {
  const livePrice = useMarketStore(
    (s) => s.markets[outcome.ticker]?.yesPrice ?? outcome.yesPrice,
  );
  const high = livePrice >= 70;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 32,
      }}
    >
      <MarketOutcomeAvatar
        name={outcome.name}
        category={event.category}
        directUrl={outcome.imageUrl ?? null}
        marketTicker={outcome.ticker}
        size={24}
      />
      <span
        style={{
          flex: 1,
          color: "#CCCCCC",
          fontSize: 12,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {outcome.name}
      </span>
      <span style={{ color: T.textMuted, fontSize: 11, flexShrink: 0 }}>
        {formatMultiplier(livePrice)}
      </span>
      <span
        style={{
          background: high ? T.greenMutedBg : T.bgTertiary,
          border: high
            ? `0.5px solid ${T.greenMutedBorder}`
            : T.hairline(T.borderHover),
          borderRadius: 5,
          padding: "2px 8px",
          color: high ? T.green : T.textPrimary,
          fontSize: 12,
          fontWeight: 600,
          minWidth: 40,
          textAlign: "center",
          flexShrink: 0,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {livePrice}%
      </span>
    </div>
  );
}

export function TrendingCardSkeleton() {
  return (
    <div
      className="lenium-skeleton"
      style={{ height: 140, borderRadius: 10 }}
    />
  );
}
