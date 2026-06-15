"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconLayoutGrid } from "@tabler/icons-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { useUiStore } from "@/stores/uiStore";
import { useMarketStore } from "@/stores/marketStore";
import MarketOutcomeAvatar from "@/components/dashboard/MarketOutcomeAvatar";
import { resolveEventIcon } from "@/lib/eventIcon";
import {
  totalTrendingMarketCount,
  type FeaturedEvent,
} from "@/lib/featuredEvents";
import type { DashboardEvent } from "@/lib/marketDetail";

function FeaturedEventsRowInner() {
  const featuredEvents = useMarketStore((s) => s.featuredEvents);
  const eventListCount = useMarketStore(
    useShallow((s) =>
      totalTrendingMarketCount(
        s.eventOrder
          .map((t) => s.events[t])
          .filter((ev): ev is DashboardEvent => !!ev),
      ),
    ),
  );
  const selected = useUiStore((s) => s.selectedEventSeries);
  const setSelected = useUiStore((s) => s.setSelectedEventSeries);
  const clearFilter = useUiStore((s) => s.clearEventSeriesFilter);
  const clearedRef = useRef(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && selected) {
        clearFilter();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, clearFilter]);

  useEffect(() => {
    if (!selected) {
      clearedRef.current = false;
      return;
    }
    const match = featuredEvents.find((e) => e.seriesTicker === selected);
    if (match && match.marketCount > 0) {
      clearedRef.current = false;
      return;
    }
    if (clearedRef.current) return;
    clearedRef.current = true;
    clearFilter();
    toast("All markets in this event have resolved.");
  }, [featuredEvents, selected, clearFilter]);

  if (featuredEvents.length === 0) return null;

  return (
    <div className="featured-events-scroll" style={rowStyle}>
      <AllMarketsButton
        active={!selected}
        marketCount={eventListCount}
        onClick={() => clearFilter()}
      />

      <AnimatePresence initial={false}>
        {featuredEvents.map((event) => (
          <motion.div
            key={event.seriesTicker}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ flexShrink: 0 }}
          >
            <EventFilterButton
              event={event}
              active={selected === event.seriesTicker}
              onClick={() => {
                if (selected === event.seriesTicker) {
                  clearFilter();
                } else {
                  setSelected(event.seriesTicker);
                }
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export const FeaturedEventsRow = React.memo(FeaturedEventsRowInner);

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  overflowX: "auto",
  margin: "16px 24px 20px",
  padding: 0,
};

function AllMarketsButton({
  active,
  marketCount,
  onClick,
}: {
  active: boolean;
  marketCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`All trending markets, ${marketCount} markets`}
      aria-pressed={active}
      onClick={onClick}
      className="featured-event-btn"
      style={buttonStyle(active)}
    >
      <span style={iconBoxStyle}>
        <IconLayoutGrid size={18} color="#555555" stroke={1.5} />
      </span>
      <span className="featured-event-copy" style={copyStyle}>
        <span className="featured-event-name" style={nameStyle}>
          All Trending
        </span>
        <span className="featured-event-count-label" style={countStyle}>
          {marketCount} markets
        </span>
        <span className="featured-event-count-mobile" style={mobileCountStyle}>
          {marketCount}
        </span>
      </span>
    </button>
  );
}

function EventFilterButton({
  event,
  active,
  onClick,
}: {
  event: FeaturedEvent;
  active: boolean;
  onClick: () => void;
}) {
  const icon = resolveEventIcon(
    event.seriesTicker,
    event.displayName,
    event.category,
    event.iconUrl,
  );

  return (
    <button
      type="button"
      aria-label={`${event.displayName}, ${event.marketCount} markets`}
      aria-pressed={active}
      onClick={onClick}
      className="featured-event-btn"
      style={buttonStyle(active)}
    >
      <span style={iconBoxStyle}>
        <EventButtonIcon icon={icon} category={event.category} />
      </span>
      <span className="featured-event-copy" style={copyStyle}>
        <span className="featured-event-name" style={nameStyle}>
          {event.displayName}
        </span>
        <span className="featured-event-count-label" style={countStyle}>
          {event.marketCount} markets
        </span>
        <span className="featured-event-count-mobile" style={mobileCountStyle}>
          {event.marketCount}
        </span>
      </span>
    </button>
  );
}

function EventButtonIcon({
  icon,
  category,
}: {
  icon: ReturnType<typeof resolveEventIcon>;
  category: string;
}) {
  if (icon.kind === "url" && icon.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon.url}
        alt=""
        width={32}
        height={32}
        style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }}
      />
    );
  }

  if (icon.kind === "avatar" && icon.avatarName) {
    return (
      <MarketOutcomeAvatar
        name={icon.avatarName}
        category={icon.avatarCategory ?? category}
        size={32}
      />
    );
  }

  const Icon = icon.Icon;
  if (!Icon) return null;
  return <Icon size={18} color={icon.iconColor ?? "#fff"} stroke={1.5} />;
}

function buttonStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    height: 56,
    flexShrink: 0,
    whiteSpace: "nowrap",
    cursor: "pointer",
    padding: "10px 16px",
    borderRadius: 10,
    background: active ? "rgba(0,232,122,0.07)" : "#111111",
    border: active
      ? "0.5px solid rgba(0,232,122,0.4)"
      : "0.5px solid #1C1C1C",
    boxShadow: active ? "inset 0 -2px 0 #00E87A" : "none",
    transition: "all 150ms ease",
    fontFamily: "inherit",
  };
}

const iconBoxStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  background: "#1C1C1C",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  overflow: "hidden",
};

const copyStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const nameStyle: React.CSSProperties = {
  color: "#fff",
  fontSize: 13,
  fontWeight: 500,
};

const countStyle: React.CSSProperties = {
  color: "#555555",
  fontSize: 11,
};

const mobileCountStyle: React.CSSProperties = {
  display: "none",
  color: "#555555",
  fontSize: 11,
  textAlign: "center",
};
