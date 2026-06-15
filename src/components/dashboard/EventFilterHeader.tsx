"use client";

import { motion } from "framer-motion";
import { IconX } from "@tabler/icons-react";
import { useUiStore } from "@/stores/uiStore";
import { useMarketStore } from "@/stores/marketStore";
import MarketOutcomeAvatar from "@/components/dashboard/MarketOutcomeAvatar";
import { resolveEventIcon } from "@/lib/eventIcon";
import { formatFeaturedVolume, featuredEventForSeries } from "@/lib/featuredEvents";
import { useShallow } from "zustand/react/shallow";
import type { DashboardEvent } from "@/lib/marketDetail";

export function EventFilterHeader() {
  const selected = useUiStore((s) => s.selectedEventSeries);
  const clearFilter = useUiStore((s) => s.clearEventSeriesFilter);
  const event = useMarketStore(
    useShallow((s) => {
      if (!selected) return null;
      const events = s.eventOrder
        .map((t) => s.events[t])
        .filter((ev): ev is DashboardEvent => !!ev);
      return featuredEventForSeries(selected, s.featuredEvents, events);
    }),
  );

  if (!selected || !event) return null;

  const icon = resolveEventIcon(
    event.seriesTicker,
    event.displayName,
    event.category,
    event.iconUrl,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      style={{
        margin: "0 24px 20px",
        padding: "20px 24px",
        background: "#111111",
        border: "0.5px solid #1C1C1C",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        fontFamily: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            background: "#161616",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <EventHeaderIcon icon={icon} category={event.category} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: "#fff",
              fontSize: 20,
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {event.displayName}
          </div>
          <div style={{ color: "#555555", fontSize: 14, marginTop: 4 }}>
            {event.marketCount} markets
            <span className="event-header-volume">
              {" "}
              · {formatFeaturedVolume(event.totalVolume)} total volume
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => clearFilter()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
          border: "0.5px solid #1C1C1C",
          borderRadius: 6,
          padding: "8px 16px",
          background: "transparent",
          color: "#555555",
          fontSize: 13,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <IconX size={14} stroke={1.5} />
        View all markets
      </button>
    </motion.div>
  );
}

function EventHeaderIcon({
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
        width={40}
        height={40}
        style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }}
      />
    );
  }

  if (icon.kind === "avatar" && icon.avatarName) {
    return (
      <MarketOutcomeAvatar
        name={icon.avatarName}
        category={icon.avatarCategory ?? category}
        size={40}
      />
    );
  }

  const Icon = icon.Icon;
  if (!Icon) return null;
  return <Icon size={24} color={icon.iconColor ?? "#fff"} stroke={1.5} />;
}
