"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { IconChevronRight } from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";
import { useMarketStore } from "@/stores/marketStore";
import { useUiStore } from "@/stores/uiStore";
import MarketOutcomeAvatar from "@/components/dashboard/MarketOutcomeAvatar";
import { CompactMarketList } from "@/components/dashboard/trending/CompactMarketList";
import {
  useSidebarHighestVolume,
  useSidebarMovers,
  useSidebarNew,
  useSidebarPrimaries,
  useSidebarTrending,
  useTrendingSeriesSections,
} from "@/hooks/useTrendingLayout";
import {
  HARDCODED_SHORTCUTS,
  buildDynamicShortcuts,
  shortcutMatchesEvent,
  type FeaturedEventShortcut,
} from "@/lib/featuredEvents";
import { T } from "@/lib/tokens";

export const TrendingRightSidebar = memo(function TrendingRightSidebar() {
  const sections = useTrendingSeriesSections();
  const shortcuts = useMemo(() => {
    const enriched = sections.map((sec) => {
      const ev = useMarketStore.getState().events[sec.eventTickers[0]];
      return {
        ...sec,
        category: ev?.category ?? "Sports",
      };
    });
    return [...HARDCODED_SHORTCUTS, ...buildDynamicShortcuts(enriched)];
  }, [sections]);

  return (
    <aside
      className="trending-right-sidebar"
      style={{
        width: 320,
        flexShrink: 0,
        position: "sticky",
        top: 108,
        alignSelf: "flex-start",
        height: "calc(100vh - 108px)",
        overflowY: "auto",
        scrollbarWidth: "none",
        fontFamily: T.font,
      }}
    >
      <EventShortcuts shortcuts={shortcuts} />

      {/* Customize your view widget — future implementation */}

      <SidebarTrendingList />
      <SidebarPrimariesList />
      <SidebarMoversList />
      <SidebarNewList />
      <SidebarVolumeList />
    </aside>
  );
});

function EventShortcuts({ shortcuts }: { shortcuts: FeaturedEventShortcut[] }) {
  const activeFilter = useUiStore((s) => s.activeSidebarFilter);
  const setFilter = useUiStore((s) => s.setActiveSidebarFilter);
  const eventCounts = useMarketStore(
    useShallow((s) => {
      const counts: Record<string, number> = {};
      for (const t of s.eventOrder) {
        const ev = s.events[t];
        if (!ev) continue;
        for (const sc of shortcuts) {
          if (shortcutMatchesEvent(sc, ev.seriesTicker, ev.subCategory, ev.category)) {
            counts[sc.id] = (counts[sc.id] ?? 0) + 1;
          }
        }
      }
      return counts;
    }),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
      {shortcuts.slice(0, 6).map((sc) => (
        <ShortcutCard
          key={sc.id}
          shortcut={sc}
          marketCount={eventCounts[sc.id] ?? 0}
          active={activeFilter === sc.seriesFilter || activeFilter === sc.id}
          onClick={() =>
            setFilter(
              activeFilter === sc.seriesFilter ? null : sc.seriesFilter,
            )
          }
        />
      ))}
    </div>
  );
}

function ShortcutCard({
  shortcut,
  marketCount,
  active,
  onClick,
}: {
  shortcut: FeaturedEventShortcut;
  marketCount: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.1 }}
      style={{
        width: "100%",
        height: 72,
        padding: "18px 20px",
        borderRadius: 12,
        border: active
          ? `0.5px solid ${T.green}`
          : `0.5px solid ${shortcut.borderColor}`,
        background: `linear-gradient(135deg, ${shortcut.gradientFrom}, ${shortcut.gradientTo})`,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
        fontFamily: T.font,
        textAlign: "left",
        animation: active ? "sidebar-pulse-border 2s ease-in-out infinite" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "rgba(255,255,255,0.08)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <ShortcutIcon shortcut={shortcut} />
        </div>
        <div>
          <div style={{ color: T.textPrimary, fontSize: 14, fontWeight: 600 }}>
            {shortcut.displayName}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>
            {marketCount > 0
              ? `${marketCount} event${marketCount === 1 ? "" : "s"}`
              : "Explore markets"}
          </div>
        </div>
      </div>
      <IconChevronRight size={18} color="rgba(255,255,255,0.4)" stroke={1.5} />
    </motion.button>
  );
}

function ShortcutIcon({ shortcut }: { shortcut: FeaturedEventShortcut }) {
  return (
    <MarketOutcomeAvatar
      name={shortcut.displayName}
      category={shortcut.category}
      directUrl={shortcut.iconUrl ?? null}
      seriesTicker={shortcut.seriesFilter}
      size={28}
    />
  );
}

const SidebarTrendingList = memo(function SidebarTrendingList() {
  const items = useSidebarTrending();
  return <CompactMarketList title="Trending" items={items} />;
});

const SidebarPrimariesList = memo(function SidebarPrimariesList() {
  const items = useSidebarPrimaries();
  if (items.length === 0) return null;
  return <CompactMarketList title="2026 Primaries" items={items} />;
});

const SidebarMoversList = memo(function SidebarMoversList() {
  const items = useSidebarMovers();
  return <CompactMarketList title="Top movers" items={items} />;
});

const SidebarNewList = memo(function SidebarNewList() {
  const items = useSidebarNew();
  return <CompactMarketList title="New" items={items} />;
});

const SidebarVolumeList = memo(function SidebarVolumeList() {
  const items = useSidebarHighestVolume();
  return <CompactMarketList title="Highest volume" items={items} />;
});
