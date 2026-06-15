"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconChevronRight } from "@tabler/icons-react";
import { toast } from "sonner";
import { useMarketStore } from "@/stores/marketStore";
import { useUiStore } from "@/stores/uiStore";
import MarketOutcomeAvatar from "@/components/dashboard/MarketOutcomeAvatar";
import { resolvePanelShortcutIcon } from "@/lib/eventIcon";
import {
  selectPanelEvents,
  shortcutCardTheme,
  type FeaturedEvent,
} from "@/lib/featuredEvents";

const panelVariants = {
  hidden: { opacity: 0, x: 20 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.15, ease: "easeIn" as const },
  },
};

const listVariants = {
  show: {
    transition: { staggerChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    transition: { duration: 0.2, ease: "easeIn" as const },
  },
};

function FeaturedEventsPanelInner() {
  const featuredEvents = useMarketStore((s) => s.featuredEvents);
  const selected = useUiStore((s) => s.selectedEventSeries);
  const setSelected = useUiStore((s) => s.setSelectedEventSeries);
  const clearFilter = useUiStore((s) => s.clearEventSeriesFilter);
  const clearedRef = useRef(false);

  const panelEvents = useMemo(
    () => selectPanelEvents(featuredEvents),
    [featuredEvents],
  );

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
    const match = panelEvents.find((e) => e.seriesTicker === selected);
    if (match && match.marketCount > 0) {
      clearedRef.current = false;
      return;
    }
    if (clearedRef.current) return;
    clearedRef.current = true;
    clearFilter();
    toast("All markets in this event have resolved.");
  }, [panelEvents, selected, clearFilter]);

  if (panelEvents.length === 0) return null;

  return (
    <motion.aside
      className="featured-events-panel"
      variants={panelVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      aria-label="Featured events"
    >
      <div className="featured-events-panel-header">Events</div>

      <motion.div
        className="featured-events-panel-list"
        variants={listVariants}
        initial="hidden"
        animate="show"
      >
        <AnimatePresence initial={false}>
          {panelEvents.map((event) => (
            <motion.div
              key={event.seriesTicker}
              layout
              variants={cardVariants}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              <EventShortcutCard
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
      </motion.div>
    </motion.aside>
  );
}

export const FeaturedEventsPanel = React.memo(FeaturedEventsPanelInner);

function EventShortcutCard({
  event,
  active,
  onClick,
}: {
  event: FeaturedEvent;
  active: boolean;
  onClick: () => void;
}) {
  const theme = shortcutCardTheme(event);
  const [hovered, setHovered] = useState(false);
  const icon = resolvePanelShortcutIcon(
    event.seriesTicker,
    event.displayName,
    event.category,
    event.iconUrl,
  );

  const background = active
    ? "rgba(0,232,122,0.06)"
    : hovered
      ? theme.hoverBackground
      : theme.background;
  const border = active
    ? "0.5px solid #00E87A"
    : hovered
      ? `0.5px solid ${theme.hoverBorder}`
      : `0.5px solid ${theme.border}`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${event.displayName}, ${event.marketCount} markets`}
      aria-pressed={active}
      className="featured-event-shortcut"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        borderRadius: 12,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
        transition: "all 150ms ease",
        overflow: "hidden",
        position: "relative",
        background,
        border,
        boxShadow: hovered && !active ? "0 4px 16px rgba(0,0,0,0.4)" : "none",
        fontFamily: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <ShortcutIcon icon={icon} category={event.category} hovered={hovered} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            minWidth: 0,
          }}
        >
          <span
            style={{
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {event.displayName}
          </span>
          <span
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 12,
              fontWeight: 400,
            }}
          >
            {event.marketCount} markets
          </span>
        </div>
      </div>

      <IconChevronRight
        size={18}
        stroke={1.5}
        color={hovered ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)"}
        style={{ flexShrink: 0, transition: "color 150ms ease" }}
      />
    </div>
  );
}

function ShortcutIcon({
  icon,
  category,
  hovered,
}: {
  icon: ReturnType<typeof resolvePanelShortcutIcon>;
  category: string;
  hovered: boolean;
}) {
  void hovered;

  if (icon.kind === "url" && icon.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon.url}
        alt=""
        width={22}
        height={22}
        style={{ width: 22, height: 22, objectFit: "cover", borderRadius: 4 }}
      />
    );
  }

  if (icon.kind === "avatar" && icon.avatarName) {
    return (
      <MarketOutcomeAvatar
        name={icon.avatarName}
        category={icon.avatarCategory ?? category}
        size={22}
      />
    );
  }

  const Icon = icon.Icon;
  if (!Icon) return null;
  return <Icon size={22} color={icon.iconColor ?? "#fff"} stroke={1.5} />;
}
