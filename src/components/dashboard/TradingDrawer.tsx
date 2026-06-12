"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconX, IconClock } from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";
import { useUiStore } from "@/stores/uiStore";
import { useMarketStore } from "@/stores/marketStore";
import { OrderEntry } from "@/components/dashboard/OrderEntry";
import { PriceChart, type TimeRange } from "@/components/dashboard/PriceChart";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { compactUsd } from "@/lib/data";
import { T, TOP_BAR_HEIGHT, DRAWER_WIDTH } from "@/lib/tokens";

const TIME_RANGES: TimeRange[] = ["1H", "6H", "1D", "1W", "ALL"];

/** Right-edge trading panel. Slides in with an x-transform spring. */
export function TradingDrawer() {
  const drawerOpen = useUiStore((s) => s.drawerOpen);
  const ticker = useUiStore((s) => s.selectedMarketTicker);

  return (
    <AnimatePresence>
      {drawerOpen && ticker && (
        <motion.aside
          key="trading-drawer"
          initial={{ x: "100%" }}
          animate={{ x: "0%" }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
          style={{
            position: "fixed",
            top: TOP_BAR_HEIGHT,
            right: 0,
            bottom: 0,
            width: DRAWER_WIDTH,
            background: T.bgSecondary,
            borderLeft: T.hairline(),
            zIndex: 35,
            overflowY: "auto",
            fontFamily: T.font,
          }}
        >
          <DrawerContent ticker={ticker} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function DrawerContent({ ticker }: { ticker: string }) {
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  const [range, setRange] = useState<TimeRange>("1D");
  const [closeHovered, setCloseHovered] = useState(false);

  const market = useMarketStore(
    useShallow((s) => {
      const m = s.markets[ticker];
      return m
        ? {
            question: m.question,
            category: m.category,
            volume: m.volume,
            expiry: m.expiry,
          }
        : null;
    }),
  );

  if (!market) {
    return (
      <div style={{ padding: 20, color: T.textMuted, fontSize: 13 }}>
        Market unavailable.
      </div>
    );
  }

  const expiryLabel = market.expiry
    ? new Date(market.expiry).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <>
      {/* Header */}
      <div
        style={{
          padding: "20px 20px 0",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h2
          style={{
            margin: 0,
            color: T.textPrimary,
            fontSize: 15,
            fontWeight: 500,
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {market.question}
        </h2>
        <div
          role="button"
          tabIndex={0}
          aria-label="Close drawer"
          onClick={closeDrawer}
          onKeyDown={(e) => e.key === "Enter" && closeDrawer()}
          onMouseEnter={() => setCloseHovered(true)}
          onMouseLeave={() => setCloseHovered(false)}
          style={{
            width: 28,
            height: 28,
            flexShrink: 0,
            background: T.bgTertiary,
            border: T.hairline(closeHovered ? T.borderHover : T.border),
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: `border-color ${T.transition}`,
          }}
        >
          <IconX
            size={16}
            color={closeHovered ? T.textPrimary : T.textMuted}
            stroke={1.5}
          />
        </div>
      </div>

      {/* Meta row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 20px 0",
        }}
      >
        <span
          style={{
            background: "rgba(255,255,255,0.04)",
            border: T.hairline(),
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: 11,
            color: T.textMuted,
          }}
        >
          {market.category}
        </span>
        <span style={{ color: T.textMuted, fontSize: 12 }}>
          {compactUsd(market.volume)} vol
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: T.textMuted,
            fontSize: 12,
          }}
        >
          <IconClock size={12} stroke={1.5} />
          {expiryLabel}
        </span>
      </div>

      <Divider />

      {/* Chart */}
      <div style={{ padding: "0 20px" }}>
        <div
          style={{
            display: "flex",
            gap: 2,
            background: T.bgTertiary,
            border: T.hairline(),
            borderRadius: 6,
            padding: 3,
            width: "fit-content",
            marginBottom: 12,
          }}
        >
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              style={{
                width: 36,
                height: 28,
                borderRadius: 4,
                border: "none",
                background: r === range ? T.border : "transparent",
                color: r === range ? T.textPrimary : T.textMuted,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: T.font,
                transition: `background ${T.transition}`,
              }}
            >
              {r}
            </button>
          ))}
        </div>
        <ErrorBoundary name="Price chart">
          <PriceChart ticker={ticker} range={range} />
        </ErrorBoundary>
      </div>

      <Divider />

      <OrderEntry ticker={ticker} />
    </>
  );
}

function Divider() {
  return <div style={{ height: 0.5, background: T.border, margin: 20 }} />;
}
