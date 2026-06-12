"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconChevronRight, IconClock } from "@tabler/icons-react";
import { FixedSizeGrid } from "react-window";
import { useShallow } from "zustand/react/shallow";
import { useUiStore } from "@/stores/uiStore";
import { useMarketStore } from "@/stores/marketStore";
import { useGroupedMarkets, type MarketSection } from "@/hooks/useMarkets";
import {
  MarketCard,
  SkeletonCard,
  useRealSparkline,
} from "@/components/dashboard/MarketCard";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { compactUsd } from "@/lib/data";
import { T } from "@/lib/tokens";

const CARD_GAP = 12;
const SECTION_GAP = 40;
const INITIAL_SECTIONS = 2;
const VIRTUALIZE_THRESHOLD = 100;
const VIRTUAL_ROW_HEIGHT = 196;

/**
 * Kalshi-style market browser: a featured trending card, then markets grouped
 * into named category sections. Sections lazy-load as the user scrolls; only
 * oversized categories (>100 markets) fall back to react-window.
 */
export function MarketGrid() {
  const { featured, sections } = useGroupedMarkets();
  const activeCategory = useUiStore((s) => s.activeCategory);
  const viewMode = useUiStore((s) => s.viewMode);

  const [visibleSections, setVisibleSections] = useState(INITIAL_SECTIONS);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // New tab — start from the top with the first sections again. Adjusting
  // state during render (guarded) avoids a cascading effect re-render.
  const [prevCategory, setPrevCategory] = useState(activeCategory);
  if (prevCategory !== activeCategory) {
    setPrevCategory(activeCategory);
    setVisibleSections(INITIAL_SECTIONS);
  }

  // Load the next section shortly before the user reaches the end.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleSections((n) => Math.min(n + 1, sections.length));
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [sections.length, visibleSections]);

  const showFeatured =
    activeCategory === "All Markets" || activeCategory === "Trending";

  if (sections.length === 0) {
    return <SkeletonSections />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeCategory}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{ paddingBottom: 48 }}
      >
        {showFeatured && featured && <FeaturedMarketCard ticker={featured} />}

        {sections.slice(0, visibleSections).map((section) => (
          <CategorySection
            key={section.category}
            section={section}
            viewMode={viewMode}
          />
        ))}

        <div ref={sentinelRef} style={{ height: 1 }} />

        {visibleSections < sections.length && (
          <div style={{ padding: "0 24px" }}>
            <div
              className="lenium-skeleton"
              style={{ height: 48, borderRadius: 10 }}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

function CategorySection({
  section,
  viewMode,
}: {
  section: MarketSection;
  viewMode: "grid" | "list";
}) {
  const setCategory = useUiStore((s) => s.setCategory);
  const [headerHovered, setHeaderHovered] = useState(false);

  return (
    <section style={{ marginBottom: SECTION_GAP - 32 }}>
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          fontFamily: T.font,
        }}
      >
        <button
          type="button"
          onClick={() => setCategory(section.category)}
          onMouseEnter={() => setHeaderHovered(true)}
          onMouseLeave={() => setHeaderHovered(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: T.textPrimary,
            fontSize: 16,
            fontWeight: 500,
            fontFamily: T.font,
          }}
        >
          {section.category}
          <IconChevronRight
            size={16}
            color={headerHovered ? T.textSecondary : T.textMuted}
            stroke={1.5}
            style={{
              transform: headerHovered ? "translateX(2px)" : "none",
              transition: `transform ${T.transition}, color ${T.transition}`,
            }}
          />
        </button>
        <span style={{ color: T.textMuted, fontSize: 13 }}>
          {section.tickers.length} market{section.tickers.length === 1 ? "" : "s"}
        </span>
      </div>

      {viewMode === "list" ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "0 24px 32px",
          }}
        >
          {section.tickers.map((ticker) => (
            <MarketCard key={ticker} ticker={ticker} variant="row" />
          ))}
        </div>
      ) : section.tickers.length > VIRTUALIZE_THRESHOLD ? (
        <VirtualCategoryGrid tickers={section.tickers} />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: CARD_GAP,
            padding: "0 24px 32px",
            alignItems: "stretch",
          }}
        >
          {section.tickers.map((ticker) => (
            <MarketCard key={ticker} ticker={ticker} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Virtualized fallback for oversized categories ───────────────────────────

function VirtualCategoryGrid({ tickers }: { tickers: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setWidth(rect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const columnCount = 3;
  const columnWidth = width > 0 ? Math.floor(width / columnCount) : 0;
  const rowCount = Math.ceil(tickers.length / columnCount);
  const height = Math.min(rowCount, 4) * VIRTUAL_ROW_HEIGHT;

  const Cell = useCallback(
    ({
      columnIndex,
      rowIndex,
      style,
    }: {
      columnIndex: number;
      rowIndex: number;
      style: CSSProperties;
    }) => {
      const ticker = tickers[rowIndex * columnCount + columnIndex];
      if (!ticker) return null;
      return (
        <div style={{ ...style, padding: CARD_GAP / 2, boxSizing: "border-box" }}>
          <MarketCard ticker={ticker} />
        </div>
      );
    },
    [tickers],
  );

  return (
    <div ref={containerRef} style={{ padding: "0 24px 32px" }}>
      {width > 0 && (
        <FixedSizeGrid
          columnCount={columnCount}
          columnWidth={columnWidth}
          rowCount={rowCount}
          rowHeight={VIRTUAL_ROW_HEIGHT}
          width={width}
          height={height}
          style={{ overflowX: "hidden" }}
        >
          {Cell}
        </FixedSizeGrid>
      )}
    </div>
  );
}

// ─── Featured trending market ─────────────────────────────────────────────────

function FeaturedMarketCard({ ticker }: { ticker: string }) {
  const market = useMarketStore(
    useShallow((s) => {
      const m = s.markets[ticker];
      if (!m) return null;
      return {
        question: m.question,
        yesPrice: m.yesPrice,
        volume: m.volume,
        expiry: m.expiry,
        sparklineData: m.sparklineData,
      };
    }),
  );
  const openDrawer = useUiStore((s) => s.openDrawer);
  const [hovered, setHovered] = useState(false);

  useRealSparkline(ticker);

  if (!market || market.yesPrice <= 0) {
    return (
      <div style={{ margin: "16px 24px 8px" }}>
        <div
          className="lenium-skeleton"
          style={{ height: 100, borderRadius: 10 }}
        />
      </div>
    );
  }

  const expiryLabel = market.expiry
    ? new Date(market.expiry).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "—";
  const hasSparkline = market.sparklineData.length >= 2;
  const up =
    hasSparkline &&
    market.yesPrice >= market.sparklineData[0];

  return (
    <div style={{ margin: "16px 24px 8px" }}>
      <div
        onClick={() => openDrawer(ticker)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          minHeight: 100,
          background: T.bgSecondary,
          border: T.hairline(hovered ? T.borderHover : T.border),
          borderRadius: 10,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          cursor: "pointer",
          boxShadow: hovered ? "0 2px 16px rgba(0,0,0,0.5)" : "none",
          transition: `border-color ${T.transition}, box-shadow ${T.transition}`,
          fontFamily: T.font,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: T.green,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.1em",
              marginBottom: 6,
            }}
          >
            TRENDING
          </div>
          <div
            title={market.question}
            style={{
              color: T.textPrimary,
              fontSize: 16,
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {market.question}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 6,
              color: T.textMuted,
              fontSize: 12,
            }}
          >
            <span>{compactUsd(market.volume)} vol</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <IconClock size={12} stroke={1.5} />
              {expiryLabel}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              color: T.textPrimary,
              fontSize: 32,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {market.yesPrice}%
          </span>
          {hasSparkline ? (
            <Sparkline
              data={market.sparklineData}
              up={up}
              width={120}
              height={40}
            />
          ) : (
            <span className="lenium-skeleton" style={{ width: 120, height: 40 }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Initial loading state ────────────────────────────────────────────────────

function SkeletonSections() {
  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{ margin: "0 24px 8px" }}>
        <div
          className="lenium-skeleton"
          style={{ height: 100, borderRadius: 10 }}
        />
      </div>
      {[0, 1].map((s) => (
        <div key={s}>
          <div
            style={{
              height: 48,
              display: "flex",
              alignItems: "center",
              padding: "0 24px",
            }}
          >
            <div
              className="lenium-skeleton"
              style={{ width: 140, height: 20, borderRadius: 6 }}
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: CARD_GAP,
              padding: "0 24px 32px",
            }}
          >
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
