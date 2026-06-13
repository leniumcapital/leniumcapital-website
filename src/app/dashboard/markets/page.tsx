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
import { useMarketsQuery, useMarketsHeading } from "@/hooks/useMarkets";
import { MarketGrid } from "@/components/dashboard/MarketGrid";
import { CategoryTabs } from "@/components/dashboard/CategoryFilter";
import { MarketsSubcategorySidebar } from "@/components/dashboard/MarketsSubcategorySidebar";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { T } from "@/lib/tokens";

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "volume", label: "Volume" },
  { value: "expiry", label: "Expiry" },
  { value: "movement", label: "Price Movement" },
  { value: "newest", label: "Newest" },
];

export default function MarketsPage() {
  useMarketsQuery();

  useEffect(() => {
    const main = document.getElementById("lenium-main");
    const top = useUiStore.getState().marketsScrollTop;
    if (main && top > 0) main.scrollTop = top;
  }, []);

  const heading = useMarketsHeading();

  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ position: "sticky", top: 0, zIndex: 31 }}>
        <CategoryTabs />
      </div>

      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <MarketsSubcategorySidebar />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "22px 24px 6px",
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

          <ErrorBoundary name="Market grid">
            <MarketGrid />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

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

function FilterMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sortOrder = useUiStore((s) => s.sortOrder);
  const setSortOrder = useUiStore((s) => s.setSortOrder);
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);

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
