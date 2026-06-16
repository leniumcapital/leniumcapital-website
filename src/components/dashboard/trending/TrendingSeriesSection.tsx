"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { useUiStore } from "@/stores/uiStore";
import {
  LazyTrendingCard,
  TrendingSectionCard,
} from "@/components/dashboard/trending/TrendingSectionCard";
import type { SeriesSection } from "@/lib/trendingLayout";
import { SECTION_PREVIEW_SIZE } from "@/lib/trendingLayout";
import { T } from "@/lib/tokens";

export function TrendingSeriesSection({ section }: { section: SeriesSection }) {
  const [expanded, setExpanded] = useState(false);
  const [headerHover, setHeaderHover] = useState(false);
  const setActiveSidebarFilter = useUiStore((s) => s.setActiveSidebarFilter);
  const activeFilter = useUiStore((s) => s.activeSidebarFilter);

  const visible = expanded
    ? section.eventTickers
    : section.eventTickers.slice(0, SECTION_PREVIEW_SIZE);
  const hasMore = section.eventTickers.length > SECTION_PREVIEW_SIZE;

  const isOther = section.seriesTicker === "OTHER";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.2 }}
      style={{ marginBottom: 8, fontFamily: T.font }}
    >
      {!isOther && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 0 12px",
          }}
        >
          <button
            type="button"
            onClick={() =>
              setActiveSidebarFilter(
                activeFilter === section.seriesTicker ? null : section.seriesTicker,
              )
            }
            onMouseEnter={() => setHeaderHover(true)}
            onMouseLeave={() => setHeaderHover(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: headerHover ? T.green : T.textPrimary,
              fontSize: 18,
              fontWeight: 500,
              fontFamily: T.font,
              transition: `color ${T.transition}`,
            }}
          >
            {section.displayName}
            <IconChevronRight size={16} color={headerHover ? T.green : T.textMuted} stroke={1.5} />
          </button>
        </div>
      )}

      {isOther && section.eventTickers.length > 0 && (
        <div style={{ padding: "20px 0 12px", color: T.textPrimary, fontSize: 18, fontWeight: 500 }}>
          {section.displayName}
        </div>
      )}

      <div
        className="trending-section-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        {visible.map((ticker, i) => (
          <motion.div
            key={ticker}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
          >
            <LazyTrendingCard eventTicker={ticker}>
              <TrendingSectionCard eventTicker={ticker} />
            </LazyTrendingCard>
          </motion.div>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "14px 0",
            marginTop: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: T.textMuted,
            fontSize: 13,
            fontFamily: T.font,
          }}
        >
          <IconChevronDown
            size={14}
            stroke={1.5}
            style={{
              transform: expanded ? "rotate(180deg)" : "none",
              transition: "transform 150ms ease",
            }}
          />
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </motion.section>
  );
}
