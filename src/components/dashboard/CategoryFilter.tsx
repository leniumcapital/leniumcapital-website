"use client";

import { IconTrendingUp } from "@tabler/icons-react";
import { useUiStore } from "@/stores/uiStore";
import { CATEGORY_ORDER } from "@/hooks/useMarkets";
import { T } from "@/lib/tokens";

/**
 * Category tab bar under the page heading — Trending first, a thin divider,
 * then All Markets and every category. Active tab is bold white; inactive tabs
 * are muted and brighten on hover.
 */
export function CategoryTabs() {
  const activeCategory = useUiStore((s) => s.activeCategory);
  const setCategory = useUiStore((s) => s.setCategory);

  return (
    <div
      className="lenium-tabbar"
      style={{
        width: "100%",
        height: 44,
        background: T.bgPrimary,
        borderTop: T.hairline(),
        borderBottom: T.hairline(),
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        gap: 28,
        overflowX: "auto",
        flexShrink: 0,
        fontFamily: T.font,
      }}
    >
      <Tab
        label="Trending"
        active={activeCategory === "Trending"}
        onClick={() => setCategory("Trending")}
        icon={<IconTrendingUp size={15} stroke={2} />}
      />

      <span
        style={{
          width: 1,
          height: 18,
          background: T.borderHover,
          flexShrink: 0,
        }}
      />

      <Tab
        label="All Markets"
        active={activeCategory === "All Markets"}
        onClick={() => setCategory("All Markets")}
      />
      {CATEGORY_ORDER.map((category) => (
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
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 6,
        height: "100%",
        padding: "0 0 2px",
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
      {icon}
      {label}
    </button>
  );
}
