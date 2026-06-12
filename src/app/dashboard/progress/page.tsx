"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { IconClock } from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";
import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import { usePositionStore, type ClosedTrade } from "@/stores/positionStore";
import { useAccountStore } from "@/stores/accountStore";
import { LeniumMark } from "@/components/ui/LeniumLogo";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { T } from "@/lib/tokens";

export default function ProgressPage() {
  const p = useChallengeProgress();
  const accountType = useAccountStore((s) => s.accountType);

  if (accountType === "none") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          height: "60vh",
          fontFamily: T.font,
        }}
      >
        <span style={{ color: T.textPrimary, fontSize: 16 }}>
          No active challenge
        </span>
        <Link
          href="/dashboard/challenge/select"
          style={{
            background: T.green,
            color: T.bgPrimary,
            borderRadius: 6,
            padding: "8px 18px",
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Start a challenge →
        </Link>
      </div>
    );
  }

  return (
    <ErrorBoundary name="Challenge progress">
      <div style={{ padding: 32, fontFamily: T.font }}>
        {/* Gauges */}
        <div style={{ display: "flex", gap: 48, justifyContent: "center" }}>
          <Gauge
            pct={p.profitPct}
            color={T.green}
            label="Profit target"
            centerTop={`$${Math.max(0, Math.round(p.currentProfit)).toLocaleString()}`}
            centerBottom={`of $${p.profitTarget.toLocaleString()}`}
          />
          <Gauge
            pct={p.drawdownConsumedPct}
            color={
              p.drawdownConsumedPct >= 90
                ? T.red
                : p.drawdownConsumedPct >= 75
                  ? T.amber
                  : T.green
            }
            label="Drawdown used"
            centerTop={`${p.drawdownConsumedPct.toFixed(0)}%`}
            centerBottom="consumed"
          />
        </div>

        {/* Calendar heatmap */}
        <CalendarHeatmap
          windowDays={p.windowDays}
          windowStartDate={p.windowStartDate}
          tradedDates={p.tradedDates}
        />
        <div style={{ color: T.textMuted, fontSize: 13, marginTop: 12 }}>
          {p.daysTraded} of {p.minTradingDays} minimum trading days completed
        </div>

        {/* Time remaining */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: T.textPrimary,
            fontSize: 14,
            marginTop: 24,
          }}
        >
          <IconClock size={16} stroke={1.5} color={T.textMuted} />
          {p.daysRemaining} days, {p.hoursRemaining} hours remaining
        </div>

        <ClosedTradesTable />
      </div>

      {p.profitPct >= 100 && <CelebrationOverlay />}
    </ErrorBoundary>
  );
}

// ─── Circular gauge ───────────────────────────────────────────────────────────

function Gauge({
  pct,
  color,
  label,
  centerTop,
  centerBottom,
}: {
  pct: number;
  color: string;
  label: string;
  centerTop: string;
  centerBottom: string;
}) {
  const size = 180;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, pct));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={T.border}
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{
              strokeDashoffset: circumference * (1 - clamped / 100),
            }}
            transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <span style={{ color: T.textPrimary, fontSize: 22, fontWeight: 500 }}>
            {centerTop}
          </span>
          <span style={{ color: T.textMuted, fontSize: 12 }}>{centerBottom}</span>
        </div>
      </div>
      <span style={{ color: T.textMuted, fontSize: 13 }}>{label}</span>
    </div>
  );
}

// ─── Trading days calendar ────────────────────────────────────────────────────

function CalendarHeatmap({
  windowDays,
  windowStartDate,
  tradedDates,
}: {
  windowDays: number;
  windowStartDate: string;
  tradedDates: string[];
}) {
  const squares = useMemo(() => {
    const start = windowStartDate ? new Date(windowStartDate) : new Date();
    const today = new Date().toISOString().slice(0, 10);
    const traded = new Set(tradedDates);

    return Array.from({ length: windowDays }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      return {
        iso,
        isToday: iso === today,
        isFuture: iso > today,
        isTraded: traded.has(iso),
      };
    });
  }, [windowDays, windowStartDate, tradedDates]);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 4,
        marginTop: 40,
        maxWidth: 15 * 32,
      }}
    >
      {squares.map((sq) => (
        <div
          key={sq.iso}
          title={sq.iso}
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            background: sq.isTraded
              ? T.green
              : sq.isFuture
                ? "#0D0D0D"
                : T.bgTertiary,
            border: sq.isToday
              ? `1px solid ${T.textPrimary}`
              : sq.isTraded
                ? "none"
                : T.hairline(),
            boxSizing: "border-box",
          }}
        />
      ))}
    </div>
  );
}

// ─── Closed trades table ──────────────────────────────────────────────────────

const TRADE_COLUMNS = [
  "Market",
  "Direction",
  "Size",
  "Entry price",
  "Exit price",
  "P&L $",
  "P&L %",
  "Closed at",
] as const;

function ClosedTradesTable() {
  const closedTrades = usePositionStore(
    useShallow((s) => s.closedTrades),
  );

  if (closedTrades.length === 0) {
    return (
      <div style={{ color: T.textMuted, fontSize: 13, marginTop: 40 }}>
        No closed trades yet.
      </div>
    );
  }

  return (
    <table
      style={{ width: "100%", borderCollapse: "collapse", marginTop: 40 }}
    >
      <thead>
        <tr style={{ background: T.bgSecondary }}>
          {TRADE_COLUMNS.map((col) => (
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
          <TradeRow key={`${t.id}-${t.closedAt}`} trade={t} />
        ))}
      </tbody>
    </table>
  );
}

function TradeRow({ trade }: { trade: ClosedTrade }) {
  const up = trade.pnl >= 0;
  const color = up ? T.green : T.red;
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
      <td style={{ ...cell, textAlign: "left", maxWidth: 320 }}>
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "block",
          }}
          title={trade.question}
        >
          {trade.question}
        </span>
      </td>
      <td style={cell}>
        <span
          style={{
            background: trade.direction === "yes" ? T.greenMutedBg : T.redMuted,
            border: T.hairline(
              trade.direction === "yes" ? T.greenMutedBorder : T.red,
            ),
            color: trade.direction === "yes" ? T.green : T.red,
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

// ─── Celebration overlay ──────────────────────────────────────────────────────

function CelebrationOverlay() {
  const [particles] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2.5 + Math.random() * 2,
      color: [T.green, T.amber, T.textPrimary][i % 3],
      size: 4 + Math.random() * 5,
    })),
  );
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10,10,10,0.94)",
          zIndex: 110,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          fontFamily: T.font,
        }}
      >
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ y: "-10vh", x: 0, opacity: 1 }}
            animate={{ y: "110vh", x: [0, 30, -20, 10], opacity: [1, 1, 0.8, 0] }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: 0,
              width: p.size,
              height: p.size,
              borderRadius: 2,
              background: p.color,
            }}
          />
        ))}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            background: T.bgSecondary,
            border: T.hairline(),
            borderRadius: T.radiusLg,
            padding: 56,
            zIndex: 1,
          }}
        >
          <LeniumMark size={44} variant="green" />
          <span style={{ color: T.textPrimary, fontSize: 32, fontWeight: 500 }}>
            Challenge passed.
          </span>
          <Link
            href="/dashboard/settings"
            style={{
              background: T.green,
              color: T.bgPrimary,
              borderRadius: T.radius,
              padding: "14px 32px",
              fontSize: 15,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Activate funded account →
          </Link>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
