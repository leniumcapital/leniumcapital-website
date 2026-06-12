"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { FixedSizeGrid, FixedSizeList } from "react-window";
import { useUiStore } from "@/stores/uiStore";
import { useVisibleMarketTickers } from "@/hooks/useMarkets";
import { MarketCard } from "@/components/dashboard/MarketCard";
import { GRID_CARD_HEIGHT, LIST_ROW_HEIGHT } from "@/lib/tokens";

const GRID_GAP = 16;
const GRID_PADDING = 24;

/**
 * Virtualized market grid. react-window renders only visible cells, so 500+
 * markets scroll without frame drops. Container size tracks the drawer
 * opening/closing via ResizeObserver.
 */
export function MarketGrid() {
  const tickers = useVisibleMarketTickers();
  const viewMode = useUiStore((s) => s.viewMode);

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const columnCount = viewMode === "list" ? 1 : size.width >= 1140 ? 3 : 2;
  const columnWidth =
    columnCount > 0
      ? Math.floor((size.width - GRID_PADDING * 2) / columnCount)
      : 0;
  const rowCount = Math.ceil(tickers.length / columnCount);

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
      const index = rowIndex * columnCount + columnIndex;
      const ticker = tickers[index];
      if (!ticker) return null;
      return (
        <div
          style={{
            ...style,
            left: (style.left as number) + GRID_PADDING,
            top: (style.top as number) + GRID_PADDING,
            padding: GRID_GAP / 2,
            boxSizing: "border-box",
          }}
        >
          <MarketCard ticker={ticker} />
        </div>
      );
    },
    [tickers, columnCount],
  );

  const Row = useCallback(
    ({ index, style }: { index: number; style: CSSProperties }) => {
      const ticker = tickers[index];
      if (!ticker) return null;
      return (
        <div style={style}>
          <MarketCard ticker={ticker} variant="row" />
        </div>
      );
    },
    [tickers],
  );

  return (
    <div ref={containerRef} style={{ flex: 1, minHeight: 0 }}>
      {size.width > 0 &&
        (viewMode === "grid" ? (
          <FixedSizeGrid
            key={`grid-${columnCount}-${Math.round(size.width)}`}
            columnCount={columnCount}
            columnWidth={columnWidth}
            rowCount={rowCount}
            rowHeight={GRID_CARD_HEIGHT + GRID_GAP}
            width={size.width}
            height={size.height}
            style={{ overflowX: "hidden" }}
          >
            {Cell}
          </FixedSizeGrid>
        ) : (
          <FixedSizeList
            key={`list-${Math.round(size.width)}`}
            itemCount={tickers.length}
            itemSize={LIST_ROW_HEIGHT}
            width={size.width}
            height={size.height}
            style={{ overflowX: "hidden" }}
          >
            {Row}
          </FixedSizeList>
        ))}
    </div>
  );
}
