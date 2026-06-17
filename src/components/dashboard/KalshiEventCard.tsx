"use client";

import { useRouter } from "next/navigation";
import { useMinuteNow } from "@/hooks/useChallengeProgress";
import { useUiStore } from "@/stores/uiStore";
import { KalshiOutcomeRow } from "@/components/dashboard/KalshiOutcomeRow";
import MarketOutcomeAvatar from "@/components/dashboard/MarketOutcomeAvatar";
import { seriesIconDirectUrl } from "@/lib/seriesIcon";
import type { DashboardEvent } from "@/lib/marketDetail";
import {
  formatCloseLabelKalshi,
  formatMarketCountLabel,
  formatVolKalshi,
  isEventLive,
  seriesDisplayName,
} from "@/lib/trendingLayout";
import { T } from "@/lib/tokens";

export type KalshiEventCardProps = {
  event: DashboardEvent;
  hovered?: boolean;
  onHover?: (v: boolean) => void;
  /** Max outcome rows (Trending cards show 2). */
  maxOutcomes?: number;
  fillHeight?: boolean;
};

/** Market card matching Kalshi's event ticker layout. */
export function KalshiEventCard({
  event,
  hovered = false,
  onHover,
  maxOutcomes = 2,
  fillHeight = false,
}: KalshiEventCardProps) {
  const router = useRouter();
  const now = useMinuteNow();
  const live = isEventLive(event.closeTime, now);
  const seriesLabel = seriesDisplayName(event.seriesTicker, event);
  const seriesIcon = seriesIconDirectUrl(event.seriesTicker);
  const outcomes = event.outcomes.slice(0, maxOutcomes);

  const openDetail = () => {
    const main = document.getElementById("lenium-main");
    if (main) useUiStore.getState().setMarketsScrollTop(main.scrollTop);
    router.push(`/dashboard/markets/${encodeURIComponent(event.leaderTicker)}`);
  };

  return (
    <div
      onClick={openDetail}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        height: fillHeight ? "100%" : undefined,
        minHeight: fillHeight ? 200 : undefined,
        background: hovered ? "#0D0D0D" : T.bgSecondary,
        border: T.hairline(hovered ? T.borderHover : T.border),
        borderRadius: 12,
        padding: 16,
        cursor: "pointer",
        transition: `background ${T.transition}, border-color ${T.transition}`,
        fontFamily: T.font,
        overflow: "hidden",
      }}
    >
      {/* Header: category icon + label | series name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              overflow: "hidden",
              flexShrink: 0,
              background: "rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MarketOutcomeAvatar
              name={event.category}
              category={event.category}
              directUrl={seriesIcon}
              seriesTicker={event.seriesTicker}
              eventTitle={event.title}
              size={28}
            />
          </div>
          <span
            style={{
              color: T.textPrimary,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {event.category}
          </span>
        </div>
        <span
          style={{
            color: T.textSecondary,
            fontSize: 11,
            fontWeight: 400,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {seriesLabel}
        </span>
      </div>

      {/* Title + time */}
      <div
        title={event.title}
        style={{
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

      <div
        style={{
          marginTop: 6,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: T.textSecondary,
          minHeight: 16,
        }}
      >
        {live && (
          <>
            <span
              className="lenium-live-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: T.red,
                flexShrink: 0,
              }}
            />
            <span style={{ color: T.red, fontWeight: 600, fontSize: 11 }}>LIVE</span>
          </>
        )}
        <span>{formatCloseLabelKalshi(event.closeTime, now)}</span>
      </div>

      {/* Outcome rows */}
      <div
        style={{
          marginTop: 14,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flex: fillHeight ? 1 : undefined,
        }}
      >
        {outcomes.map((o, i) => (
          <KalshiOutcomeRow
            key={o.ticker}
            name={o.name}
            category={event.category}
            ticker={o.ticker}
            yesPrice={o.yesPrice}
            imageUrl={o.imageUrl}
            seriesTicker={event.seriesTicker}
            eventTitle={event.title}
            index={i}
          />
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          color: T.textSecondary,
          fontSize: 11,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span style={{ whiteSpace: "nowrap" }}>{formatVolKalshi(event.totalVolume)} vol</span>
        <span style={{ whiteSpace: "nowrap", textAlign: "right" }}>
          {formatMarketCountLabel(event)}
        </span>
      </div>
    </div>
  );
}
