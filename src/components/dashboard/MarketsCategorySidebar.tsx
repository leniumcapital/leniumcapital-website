"use client";

import { useUiStore } from "@/stores/uiStore";
import { useAvailableCategories } from "@/hooks/useMarkets";
import { T } from "@/lib/tokens";

const SIDEBAR_WIDTH = 200;

/**
 * Secondary category navigation for the markets page — text only,
 * Kalshi-style left panel inside the dashboard content area.
 */
export function MarketsCategorySidebar() {
  const activeCategory = useUiStore((s) => s.activeCategory);
  const setCategory = useUiStore((s) => s.setCategory);
  const categories = useAvailableCategories();

  return (
    <aside
      style={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        borderRight: T.hairline(),
        padding: "24px 0 32px",
        fontFamily: T.font,
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        maxHeight: "calc(100vh - 56px)",
        overflowY: "auto",
      }}
    >
      <NavItem
        label="All Markets"
        active={activeCategory === "All Markets"}
        onClick={() => setCategory("All Markets")}
      />
      {categories.map((category) => (
        <NavItem
          key={category}
          label={category}
          active={activeCategory === category}
          onClick={() => setCategory(category)}
        />
      ))}
    </aside>
  );
}

function NavItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "12px 20px",
        border: "none",
        borderLeft: active ? `2px solid ${T.green}` : "2px solid transparent",
        background: "transparent",
        color: active ? T.textPrimary : T.textSecondary,
        fontSize: 14,
        fontWeight: active ? 500 : 400,
        cursor: "pointer",
        fontFamily: T.font,
        transition: `color ${T.transition}, border-color ${T.transition}`,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = "#CCCCCC";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = T.textSecondary;
      }}
    >
      {label}
    </button>
  );
}
