"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconSearch,
  IconAdjustmentsHorizontal,
  IconLayoutGrid,
  IconList,
  IconCheck,
} from "@tabler/icons-react";
import { useUiStore, type SortOrder, type ViewMode } from "@/stores/uiStore";
import { useMarketsQuery, useSportsSubcategories } from "@/hooks/useMarkets";
import { MarketGrid } from "@/components/dashboard/MarketGrid";
import { CategoryTabs } from "@/components/dashboard/CategoryFilter";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { T } from "@/lib/tokens";

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "volume", label: "Volume" },
  { value: "expiry", label: "Expiry" },
  { value: "movement", label: "Price Movement" },
  { value: "newest", label: "Newest" },
];

export default function MarketsPage() {
  useMarketsQuery(); // initial fetch; the live feed keeps prices current

  // Restore the grid scroll position when returning from a detail page.
  useEffect(() => {
    const main = document.getElementById("lenium-main");
    const top = useUiStore.getState().marketsScrollTop;
    if (main && top > 0) main.scrollTop = top;
  }, []);

  const activeCategory = useUiStore((s) => s.activeCategory);
  const heading =
    activeCategory === "All Markets" ? "All markets" : activeCategory;

  return (
    <div style={{ fontFamily: T.font }}>
      {/* Page header: title + search, then category picker directly below */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 31,
          background: T.bgPrimary,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "22px 24px 12px",
          }}
        >
          <h1
            style={{
              margin: 0,
              color: T.textPrimary,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {heading}
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <EventSearchInput />
            <FilterMenu />
          </div>
        </div>

        <CategoryTabs />
      </div>

      {/* Sports sub-menu: pick a specific sport, Kalshi-style */}
      {activeCategory === "Sports" && <SportsSubTabs />}

      <ErrorBoundary name="Market grid">
        <MarketGrid />
      </ErrorBoundary>
    </div>
  );
}

// ─── Sports sub-menu: one chip per sport present in the live data ─────────────

function SportsSubTabs() {
  const sports = useSportsSubcategories();
  const sportsFilter = useUiStore((s) => s.sportsFilter);
  const setSportsFilter = useUiStore((s) => s.setSportsFilter);

  if (sports.length === 0) return null;

  const chips = [{ name: "All", count: 0 }, ...sports];

  return (
    <div
      className="lenium-tabbar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 24px 4px",
        overflowX: "auto",
      }}
    >
      {chips.map(({ name }) => {
        const active = sportsFilter === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => setSportsFilter(name)}
            style={{
              height: 32,
              padding: "0 14px",
              borderRadius: 999,
              border: `1px solid ${active ? "#3A3A3A" : "#2C2C2C"}`,
              background: active ? T.bgTertiary : "transparent",
              color: active ? T.textPrimary : T.textMuted,
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: `color ${T.transition}, background ${T.transition}, border-color ${T.transition}`,
              fontFamily: T.font,
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.color = "#CCCCCC";
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.color = T.textMuted;
            }}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}

// ─── Event search (filters the grid, separate from the global top-bar search) ─

function EventSearchInput() {
  const eventSearch = useUiStore((s) => s.eventSearch);
  const setEventSearch = useUiStore((s) => s.setEventSearch);
  const [focused, setFocused] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "min(300px, 36vw)",
        height: 38,
        padding: "0 14px",
        background: "transparent",
        border: `1px solid ${focused ? "#3A3A3A" : "#2C2C2C"}`,
        borderRadius: 10,
        transition: `border-color ${T.transition}`,
      }}
    >
      <IconSearch size={15} color={T.textMuted} stroke={1.75} />
      <input
        value={eventSearch}
        onChange={(e) => setEventSearch(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search events..."
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          background: "transparent",
          outline: "none",
          color: T.textPrimary,
          fontSize: 13,
          fontFamily: T.font,
        }}
      />
    </div>
  );
}

// ─── Filter popover: sort order + view mode behind one adjustments button ─────

function FilterMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sortOrder = useUiStore((s) => s.sortOrder);
  const setSortOrder = useUiStore((s) => s.setSortOrder);
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);

  // Close when clicking anywhere outside the popover.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="Sort and view options"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 38,
          height: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: open ? T.bgTertiary : "transparent",
          border: `1px solid ${open ? "#3A3A3A" : "#2C2C2C"}`,
          borderRadius: 10,
          color: open ? T.textPrimary : T.textMuted,
          cursor: "pointer",
          transition: `color ${T.transition}, border-color ${T.transition}`,
        }}
      >
        <IconAdjustmentsHorizontal size={17} stroke={1.75} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: 44,
              right: 0,
              width: 200,
              background: T.bgTertiary,
              border: T.hairline(T.borderHover),
              borderRadius: 10,
              padding: 6,
              zIndex: 60,
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              fontFamily: T.font,
            }}
          >
            <div
              style={{
                color: T.textMuted,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "6px 10px 4px",
              }}
            >
              Sort by
            </div>
            {SORT_OPTIONS.map((o) => (
              <MenuRow
                key={o.value}
                label={o.label}
                selected={sortOrder === o.value}
                onClick={() => setSortOrder(o.value)}
              />
            ))}

            <div
              style={{
                height: 0.5,
                background: T.borderHover,
                margin: "6px 4px",
              }}
            />

            <div
              style={{
                color: T.textMuted,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "6px 10px 4px",
              }}
            >
              View
            </div>
            <div style={{ display: "flex", gap: 4, padding: "2px 6px 6px" }}>
              <ViewToggleButton
                mode="grid"
                active={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
              />
              <ViewToggleButton
                mode="list"
                active={viewMode === "list"}
                onClick={() => setViewMode("list")}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: 32,
        padding: "0 10px",
        background: "transparent",
        border: "none",
        borderRadius: 6,
        color: selected ? T.textPrimary : T.textSecondary,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: T.font,
        transition: `background ${T.transition}`,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = T.bgSecondary)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {label}
      {selected && <IconCheck size={14} stroke={2} color={T.green} />}
    </button>
  );
}

function ViewToggleButton({
  mode,
  active,
  onClick,
}: {
  mode: ViewMode;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = mode === "grid" ? IconLayoutGrid : IconList;
  return (
    <button
      type="button"
      aria-label={`${mode} view`}
      onClick={onClick}
      style={{
        flex: 1,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? T.bgSecondary : "transparent",
        border: active ? T.hairline(T.borderHover) : "0.5px solid transparent",
        borderRadius: 6,
        color: active ? T.textPrimary : T.textMuted,
        cursor: "pointer",
        transition: `background ${T.transition}`,
      }}
    >
      <Icon size={16} stroke={1.5} />
    </button>
  );
}
