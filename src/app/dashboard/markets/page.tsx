"use client";

import { useEffect } from "react";
import { IconLayoutGrid, IconList } from "@tabler/icons-react";
import { useUiStore, type SortOrder, type ViewMode } from "@/stores/uiStore";
import { useMarketsQuery } from "@/hooks/useMarkets";
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
  const sortOrder = useUiStore((s) => s.sortOrder);
  const setSortOrder = useUiStore((s) => s.setSortOrder);
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);

  return (
    <div style={{ fontFamily: T.font }}>
      {/* Sticky subheader: breadcrumb + controls */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 31,
          background: T.bgPrimary,
          borderBottom: T.hairline(),
          padding: "0 24px",
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: T.textMuted, fontSize: 14 }}>Markets</span>
          {activeCategory !== "All Markets" && (
            <>
              <span style={{ color: T.textMuted, fontSize: 14 }}>/</span>
              <span style={{ color: T.textPrimary, fontSize: 14, fontWeight: 500 }}>
                {activeCategory}
              </span>
            </>
          )}
        </div>

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
        </div>
      </div>

      {/* Sticky category tab bar directly below the subheader */}
      <div style={{ position: "sticky", top: 48, zIndex: 30 }}>
        <CategoryTabs />
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
