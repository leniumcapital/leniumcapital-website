"use client";

import { IconHistory } from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";
import { usePositionStore, type ClosedTrade } from "@/stores/positionStore";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { T } from "@/lib/tokens";

const COLUMNS = [
  "Market",
  "Direction",
  "Size",
  "Entry price",
  "Exit price",
  "P&L $",
  "P&L %",
  "Closed at",
] as const;

export default function HistoryPage() {
  const closedTrades = usePositionStore(useShallow((s) => s.closedTrades));

  return (
    <ErrorBoundary name="Trade history">
      <div style={{ flex: 1, fontFamily: T.font }}>
        {closedTrades.length === 0 ? (
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
            <IconHistory size={48} color={T.borderHover} stroke={1.5} />
            <span style={{ color: T.textPrimary, fontSize: 16, marginTop: 8 }}>
              No trade history
            </span>
            <span style={{ color: T.textMuted, fontSize: 13 }}>
              Closed trades will appear here
            </span>
          </div>
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
              {closedTrades.map((t) => (
                <HistoryRow key={`${t.id}-${t.closedAt}`} trade={t} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ErrorBoundary>
  );
}

function HistoryRow({ trade }: { trade: ClosedTrade }) {
  const up = trade.pnl >= 0;
  const color = up ? T.green : T.red;
  const yes = trade.direction === "yes";

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
            title={trade.question}
          >
            {trade.question}
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
            {trade.category}
          </span>
        </div>
      </td>
      <td style={cell}>
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
          {trade.direction.toUpperCase()}
        </span>
      </td>
      <td style={cell}>${trade.size.toLocaleString()}</td>
      <td style={{ ...cell, color: T.textSecondary }}>{trade.entryPrice}¢</td>
      <td style={{ ...cell, color: T.textSecondary }}>{trade.exitPrice}¢</td>
      <td style={{ ...cell, color, fontWeight: 500 }}>
        {up ? "+" : "−"}${Math.abs(trade.pnl).toFixed(2)}
      </td>
      <td style={{ ...cell, color }}>
        {up ? "+" : "−"}{Math.abs(trade.pnlPercent).toFixed(1)}%
      </td>
      <td style={{ ...cell, color: T.textSecondary }}>
        {new Date(trade.closedAt).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </td>
    </tr>
  );
}
