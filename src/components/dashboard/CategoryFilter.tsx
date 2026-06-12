"use client";

import { motion } from "framer-motion";
import { useUiStore } from "@/stores/uiStore";
import { useCategoryCounts, CATEGORY_ORDER } from "@/hooks/useMarkets";
import { T } from "@/lib/tokens";

const TRENDING_TAB_SIZE = 20;

/**
 * Horizontal category tab bar below the markets subheader — the primary way
 * to switch categories. The active background morphs between tabs.
 */
export function CategoryTabs() {
  const activeCategory = useUiStore((s) => s.activeCategory);
  const setCategory = useUiStore((s) => s.setCategory);
  const counts = useCategoryCounts();

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const tabs: { label: string; count: number }[] = [
    { label: "All Markets", count: total },
    { label: "Trending", count: Math.min(TRENDING_TAB_SIZE, total) },
    ...CATEGORY_ORDER.map((c) => ({ label: c, count: counts[c] ?? 0 })),
  ];

  return (
    <div
      className="lenium-tabbar"
      style={{
        width: "100%",
        height: 44,
        background: T.bgPrimary,
        borderBottom: T.hairline(),
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        gap: 4,
        overflowX: "auto",
        flexShrink: 0,
        fontFamily: T.font,
      }}
    >
      {tabs.map(({ label, count }) => {
        const active = label === activeCategory;
        return (
          <button
            key={label}
            type="button"
            onClick={() => setCategory(label)}
            style={{
              position: "relative",
              height: 32,
              padding: "0 14px",
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: active ? T.textPrimary : T.textMuted,
              fontSize: 13,
              fontWeight: active ? 500 : 400,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 100ms ease, background 100ms ease",
              fontFamily: T.font,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.color = T.textSecondary;
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.color = T.textMuted;
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            {active && (
              <motion.span
                layoutId="activeTabBg"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: T.bgTertiary,
                  border: T.hairline(),
                  borderRadius: 6,
                }}
              />
            )}
            <span style={{ position: "relative", zIndex: 1 }}>
              {label}{" "}
              <span
                style={{
                  fontSize: 11,
                  color: active ? T.textSecondary : T.textMuted,
                  opacity: 0.9,
                }}
              >
                {count}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
