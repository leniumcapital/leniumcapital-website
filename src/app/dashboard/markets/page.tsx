"use client";

import { motion, AnimatePresence } from "framer-motion";
import { IconLayoutGrid, IconList } from "@tabler/icons-react";
import { useUiStore, type SortOrder, type ViewMode } from "@/stores/uiStore";
import { useMarketsQuery, useVisibleMarketTickers } from "@/hooks/useMarkets";
import { MarketGrid } from "@/components/dashboard/MarketGrid";
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

  const activeCategory = useUiStore((s) => s.activeCategory);
  const sortOrder = useUiStore((s) => s.sortOrder);
  const setSortOrder = useUiStore((s) => s.setSortOrder);
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const tickers = useVisibleMarketTickers();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        fontFamily: T.font,
      }}
    >
      {/* Sticky subheader */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: T.bgPrimary,
          borderBottom: T.hairline(),
          padding: "0 24px",
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.h1
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{
              margin: 0,
              color: T.textPrimary,
              fontSize: 18,
              fontWeight: 500,
            }}
          >
            {activeCategory}
          </motion.h1>
        </AnimatePresence>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            aria-label="Sort order"
            style={{
              background: T.bgTertiary,
              border: T.hairline(),
              borderRadius: 6,
              color: T.textPrimary,
              fontSize: 12,
              height: 32,
              padding: "0 8px",
              outline: "none",
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 4 }}>
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

          <span
            style={{
              color: T.textMuted,
              fontSize: 13,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {tickers.length} markets
          </span>
        </div>
      </div>

      <ErrorBoundary name="Market grid">
        <MarketGrid />
      </ErrorBoundary>
    </div>
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
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? T.bgTertiary : "transparent",
        border: active ? T.hairline() : "0.5px solid transparent",
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
