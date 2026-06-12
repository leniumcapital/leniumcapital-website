"use client";

import React, { useEffect, useState } from "react";
import { IconMoodEmpty } from "@tabler/icons-react";
import { useOpenPositions, useClosePosition } from "@/hooks/usePositions";
import { useMarketStore } from "@/stores/marketStore";
import {
  computePnl,
  type Position,
  type Direction,
} from "@/stores/positionStore";
import { useMarketsQuery } from "@/hooks/useMarkets";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { T } from "@/lib/tokens";

const COLUMNS = [
  "Market",
  "Direction",
  "Size",
  "Entry",
  "Current",
  "P&L $",
  "P&L %",
  "Time open",
  "Close",
] as const;

function formatDuration(openedAt: number): string {
  const ms = Date.now() - openedAt;
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${Math.max(1, minutes)}m`;
}

export default function PositionsPage() {
  useMarketsQuery();
  const positions = useOpenPositions();

  return (
    <ErrorBoundary name="Positions table">
      <div style={{ flex: 1, fontFamily: T.font }}>
        {positions.length === 0 ? (
          <EmptyState />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  background: T.bgSecondary,
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                }}
              >
                {COLUMNS.map((col) => (
                  <th
                    key={col}
                    style={{
                      color: T.textMuted,
                      fontSize: 12,
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      textAlign: col === "Market" ? "left" : "right",
                      padding: "12px 16px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <PositionRow key={p.id} position={p} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ErrorBoundary>
  );
}

const PositionRow = React.memo(
  function PositionRow({ position }: { position: Position }) {
    const closePosition = useClosePosition();

    // Live current price for this market only.
    const currentPrice = useMarketStore((s) => {
      const m = s.markets[position.marketTicker];
      if (!m) return position.entryPrice;
      return position.direction === "yes" ? m.yesPrice : m.noPrice;
    });

    // Re-render the duration each minute.
    const [, tick] = useState(0);
    useEffect(() => {
      const id = setInterval(() => tick((n) => n + 1), 60_000);
      return () => clearInterval(id);
    }, []);

    const pnl = computePnl(position, currentPrice);
    const pnlPct = position.size > 0 ? (pnl / position.size) * 100 : 0;
    const up = pnl >= 0;
    const pnlColor = up ? T.green : T.red;

    const cell: React.CSSProperties = {
      padding: "0 16px",
      textAlign: "right",
      fontSize: 13,
      color: T.textPrimary,
      fontVariantNumeric: "tabular-nums",
      whiteSpace: "nowrap",
    };

    return (
      <tr style={{ height: 56, borderBottom: T.hairline() }}>
        <td style={{ ...cell, textAlign: "left", maxWidth: 360 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={position.question}
            >
              {position.question}
            </span>
            <span
              style={{
                background: "rgba(255,255,255,0.04)",
                border: T.hairline(),
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: 11,
                color: T.textMuted,
                flexShrink: 0,
              }}
            >
              {position.category}
            </span>
          </div>
        </td>
        <td style={cell}>
          <DirectionBadge direction={position.direction} />
        </td>
        <td style={cell}>${position.size.toLocaleString()}</td>
        <td style={{ ...cell, color: T.textSecondary }}>
          {position.entryPrice}¢
        </td>
        <td style={cell}>{currentPrice}¢</td>
        <td style={{ ...cell, color: pnlColor, fontWeight: 500 }}>
          {up ? "+" : "−"}${Math.abs(pnl).toFixed(2)}
        </td>
        <td style={{ ...cell, color: pnlColor }}>
          {up ? "+" : "−"}{Math.abs(pnlPct).toFixed(1)}%
        </td>
        <td style={{ ...cell, color: T.textSecondary }}>
          {formatDuration(position.openedAt)}
        </td>
        <td style={cell}>
          <button
            type="button"
            disabled={closePosition.isPending}
            onClick={() => closePosition.mutate(position)}
            style={{
              background: "transparent",
              border: T.hairline(T.red),
              borderRadius: 6,
              color: T.red,
              fontSize: 12,
              padding: "5px 14px",
              cursor: "pointer",
              fontFamily: T.font,
              opacity: closePosition.isPending ? 0.5 : 1,
            }}
          >
            Close
          </button>
        </td>
      </tr>
    );
  },
  (prev, next) => prev.position.id === next.position.id,
);

function DirectionBadge({ direction }: { direction: Direction }) {
  const yes = direction === "yes";
  return (
    <span
      style={{
        background: yes ? T.greenMutedBg : T.redMuted,
        border: T.hairline(yes ? T.greenMutedBorder : T.red),
        color: yes ? T.green : T.red,
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 4,
        padding: "2px 8px",
      }}
    >
      {direction.toUpperCase()}
    </span>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: "60vh",
      }}
    >
      <IconMoodEmpty size={48} color={T.borderHover} stroke={1.5} />
      <span style={{ color: T.textPrimary, fontSize: 16, marginTop: 8 }}>
        No open positions
      </span>
      <span style={{ color: T.textMuted, fontSize: 13 }}>
        Pick a market and make your first trade
      </span>
    </div>
  );
}
