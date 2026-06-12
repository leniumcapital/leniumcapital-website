"use client";

import { useUiStore } from "@/stores/uiStore";
import { useCategoryCounts } from "@/hooks/useMarkets";
import { T } from "@/lib/tokens";

export const CATEGORIES = [
  "All Markets",
  "Economics",
  "Politics",
  "Sports",
  "Crypto",
  "Culture",
  "Climate",
  "Science and Tech",
  "Health",
] as const;

/** Sidebar category list with live contract-count badges. */
export function CategoryFilter() {
  const activeCategory = useUiStore((s) => s.activeCategory);
  const setCategory = useUiStore((s) => s.setCategory);
  const counts = useCategoryCounts();

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ padding: 8 }}>
      <div
        style={{
          padding: "6px 10px",
          marginBottom: 2,
          color: T.green,
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.1em",
        }}
      >
        MARKETS
      </div>
      {CATEGORIES.map((category) => {
        const active = category === activeCategory;
        const count =
          category === "All Markets" ? total : (counts[category] ?? 0);
        return (
          <button
            key={category}
            type="button"
            onClick={() => setCategory(category)}
            style={{
              width: "100%",
              height: 34,
              padding: "0 10px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: active ? T.greenMutedBg : "transparent",
              border: active ? T.hairline(T.greenMutedBorder) : "0.5px solid transparent",
              color: active ? T.green : T.textMuted,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: T.font,
              transition: `background ${T.transition}`,
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = T.bgSecondary;
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = "transparent";
            }}
          >
            <span>{category}</span>
            <span
              style={{
                background: T.border,
                borderRadius: 4,
                padding: "1px 7px",
                fontSize: 11,
                color: T.textMuted,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
