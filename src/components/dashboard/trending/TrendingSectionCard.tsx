"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMarketStore } from "@/stores/marketStore";
import { useUiStore } from "@/stores/uiStore";
import { useMinuteNow } from "@/hooks/useChallengeProgress";
import { KalshiOutcomeRow } from "@/components/dashboard/KalshiOutcomeRow";
import MarketOutcomeAvatar from "@/components/dashboard/MarketOutcomeAvatar";
import { seriesIconDirectUrl } from "@/lib/seriesIcon";
import type { DashboardEvent } from "@/lib/marketDetail";
import {
  formatCloseLabel,
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
          style={{ height: 168, borderRadius: 10 }}
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
  const maxProb = Math.max(...outcomes.map((o) => o.yesPrice), 1);
  const seriesIcon = seriesIconDirectUrl(event.seriesTicker);

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
        minHeight: 168,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <CategoryBadge label={event.category} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span
            style={{
              color: T.textMuted,
              fontSize: 10,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {seriesLabel}
          </span>
          {seriesIcon && (
            <MarketOutcomeAvatar
              name={seriesLabel}
              category={event.category}
              directUrl={seriesIcon}
              seriesTicker={event.seriesTicker}
              eventTitle={event.title}
              size={18}
            />
          )}
        </div>
      </div>

      <div>
        <div
          title={event.title}
          style={{
            color: T.textPrimary,
            fontSize: 13,
            fontWeight: 600,
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
              <span
                className="lenium-live-dot"
                style={{ width: 6, height: 6, borderRadius: "50%", background: T.red }}
              />
              <span style={{ color: T.red, fontWeight: 600, fontSize: 10 }}>LIVE</span>
            </>
          )}
          <span>{formatCloseLabel(event.closeTime, now)}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
        {outcomes.map((o) => (
          <KalshiOutcomeRow
            key={o.ticker}
            name={o.name}
            category={event.category}
            ticker={o.ticker}
            yesPrice={o.yesPrice}
            imageUrl={o.imageUrl}
            seriesTicker={event.seriesTicker}
            eventTitle={event.title}
            isLeader={o.yesPrice >= maxProb - 0.5}
            compact
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: T.textMuted,
          fontSize: 11,
          marginTop: "auto",
          paddingTop: 2,
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
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

export function TrendingCardSkeleton() {
  return (
    <div
      className="lenium-skeleton"
      style={{ height: 168, borderRadius: 10 }}
    />
  );
}
