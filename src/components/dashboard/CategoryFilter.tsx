"use client";

import { PRIMARY_TABS } from "@/lib/marketCategories";
import { useUiStore } from "@/stores/uiStore";
import { T } from "@/lib/tokens";

/**
 * Kalshi-style primary navigation: horizontal scrollable text tabs with a
 * white underline on the active category. Always visible at the top of
 * the markets page.
 */
export function CategoryTabs() {
  const activeCategory = useUiStore((s) => s.activeCategory);
  const setCategory = useUiStore((s) => s.setCategory);

  return (
    <div
      className="lenium-tabbar"
      style={{
        width: "100%",
        height: 48,
        background: T.bgPrimary,
        borderBottom: T.hairline(),
        padding: "0 24px",
        display: "flex",
        alignItems: "stretch",
        gap: 28,
        overflowX: "auto",
        flexShrink: 0,
        fontFamily: T.font,
      }}
    >
      {PRIMARY_TABS.map((category) => (
        <Tab
          key={category}
          label={category}
          active={activeCategory === category}
          onClick={() => setCategory(category)}
        />
      ))}
    </div>
  );
}

function Tab({
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
        position: "relative",
        display: "flex",
        alignItems: "center",
        height: "100%",
        padding: 0,
        border: "none",
        background: "transparent",
        color: active ? T.textPrimary : "#888888",
        fontSize: 13.5,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "color 120ms ease",
        fontFamily: T.font,
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = "#CCCCCC";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = "#888888";
      }}
    >
      {label}
      {active && (
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 2,
            background: T.textPrimary,
            borderRadius: 1,
          }}
        />
      )}
    </button>
  );
}
