"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import { useMarketStore, type Market } from "@/stores/marketStore";
import { useUiStore } from "@/stores/uiStore";
import { T } from "@/lib/tokens";

const MAX_RESULTS = 30;

/** Grouped search results dropdown under the top-bar search input. */
export function SearchModal() {
  const query = useUiStore((s) => s.searchQuery);
  const openDrawer = useUiStore((s) => s.openDrawer);

  // Subscribe to tickers + questions only — not live prices.
  const searchIndex = useMarketStore(
    useShallow((s) =>
      s.order.map((t) => {
        const m = s.markets[t];
        return { ticker: t, question: m.question, category: m.category };
      }),
    ),
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matches = searchIndex
      .filter(
        (m) =>
          m.question.toLowerCase().includes(q) ||
          m.ticker.toLowerCase().includes(q),
      )
      .slice(0, MAX_RESULTS);

    const byCategory = new Map<string, typeof matches>();
    for (const m of matches) {
      const list = byCategory.get(m.category) ?? [];
      list.push(m);
      byCategory.set(m.category, list);
    }
    return Array.from(byCategory.entries());
  }, [query, searchIndex]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{
        position: "absolute",
        top: 42,
        left: 0,
        width: 420,
        maxHeight: 400,
        overflowY: "auto",
        background: T.bgTertiary,
        border: T.hairline(),
        borderRadius: 10,
        zIndex: 100,
        boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        padding: 8,
      }}
    >
      {groups.length === 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 48,
            color: T.textMuted,
            fontSize: 13,
          }}
        >
          No markets found
        </div>
      ) : (
        groups.map(([category, items]) => (
          <div key={category} style={{ marginBottom: 8 }}>
            <div
              style={{
                color: T.textMuted,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 4,
                padding: "4px 14px 0",
              }}
            >
              {category}
            </div>
            {items.map((m) => (
              <SearchResultRow
                key={m.ticker}
                ticker={m.ticker}
                question={m.question}
                onSelect={() => openDrawer(m.ticker)}
              />
            ))}
          </div>
        ))
      )}
    </motion.div>
  );
}

function SearchResultRow({
  ticker,
  question,
  onSelect,
}: {
  ticker: string;
  question: string;
  onSelect: () => void;
}) {
  // Each row subscribes only to its own market's price.
  const yesPrice = useMarketStore(
    (s: { markets: Record<string, Market> }) => s.markets[ticker]?.yesPrice ?? 0,
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 48,
        padding: "0 14px",
        cursor: "pointer",
        borderRadius: 6,
        transition: `background ${T.transition}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = T.border;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span
        style={{
          flex: 1,
          color: T.textPrimary,
          fontSize: 13,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {question}
      </span>
      <span style={{ color: T.green, fontSize: 13, flexShrink: 0 }}>
        {yesPrice}%
      </span>
    </div>
  );
}
