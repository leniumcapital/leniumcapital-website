"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconCalendar,
  IconChartLine,
  IconClock,
  IconTarget,
  IconTrendingDown,
} from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";
import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import { usePositionStore, type ClosedTrade } from "@/stores/positionStore";
import { useAccountStore } from "@/stores/accountStore";
import { StartChallengeButton } from "@/components/dashboard/StartChallengeButton";
import { LeniumMark } from "@/components/ui/LeniumLogo";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { T } from "@/lib/tokens";
import { usd } from "@/lib/pricing";

export default function ProgressPage() {
  const accountType = useAccountStore((s) => s.accountType);
  const tier = useAccountStore((s) => s.tier);
  const challengeStatus = useAccountStore((s) => s.challengeStatus);
  const p = useChallengeProgress();

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
        <IconTarget size={48} color={T.borderHover} stroke={1.5} />
        <span style={{ color: T.textPrimary, fontSize: 16, marginTop: 4 }}>
          No active challenge
        </span>
        <span style={{ color: T.textMuted, fontSize: 13 }}>
          Start a demo account to track your progress here
        </span>
        <StartChallengeButton
          preferDemo
          style={{ fontSize: 13, padding: "10px 20px", marginTop: 8 }}
        >
          Start demo account →
        </StartChallengeButton>
      </div>
    );
  }

  const statusLabel =
    challengeStatus === "passed"
      ? "Passed"
      : challengeStatus === "breached"
        ? "Breached"
        : challengeStatus === "expired"
          ? "Expired"
          : accountType === "funded"
            ? "Funded"
            : "In progress";

  const statusColor =
    challengeStatus === "passed" || accountType === "funded"
      ? T.green
      : challengeStatus === "breached" || challengeStatus === "expired"
        ? T.red
        : T.amber;

  const drawdownColor =
    p.drawdownConsumedPct >= 90
      ? T.red
      : p.drawdownConsumedPct >= 75
        ? T.amber
        : T.green;

  return (
    <ErrorBoundary name="Challenge progress">
      <DashboardPage title="Challenge progress" maxWidth={960}>
        {/* Header summary */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginTop: -8,
          }}
        >
          <p style={{ margin: 0, color: T.textSecondary, fontSize: 14 }}>
            {tier > 0 ? `${usd(tier)} account` : "Evaluation account"}
            {accountType === "funded" ? " · Live" : " · Demo"}
          </p>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: statusColor,
              background:
                statusColor === T.green
                  ? T.greenMutedBg
                  : statusColor === T.red
                    ? T.redMuted
                    : T.amberMuted,
              border: T.hairline(
                statusColor === T.green ? T.greenMutedBorder : statusColor,
              ),
              borderRadius: T.radiusPill,
              padding: "4px 10px",
            }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Stat cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          <StatCard
            icon={<IconChartLine size={16} stroke={1.5} />}
            label="Profit"
            value={usd(Math.max(0, Math.round(p.currentProfit)))}
            sub={`of ${usd(p.adjustedProfitTarget)} target`}
            accent={T.green}
          />
          <StatCard
            icon={<IconTrendingDown size={16} stroke={1.5} />}
            label="Drawdown used"
            value={`${p.drawdownConsumedPct.toFixed(0)}%`}
            sub={`${p.currentDrawdown.toFixed(1)}% of ${p.maxDrawdown}% limit`}
            accent={drawdownColor}
          />
          <StatCard
            icon={<IconCalendar size={16} stroke={1.5} />}
            label="Days traded"
            value={String(p.daysTraded)}
            sub={`in ${p.windowDays}-day window`}
            accent={T.textSecondary}
          />
          <StatCard
            icon={<IconClock size={16} stroke={1.5} />}
            label="Time left"
            value={`${p.daysRemaining}d ${p.hoursRemaining}h`}
            sub="until window closes"
            accent={p.daysRemaining <= 5 ? T.amber : T.textSecondary}
          />
        </div>

        {/* Main metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          <ProgressCard title="Profit target">
            <MetricBar
              pct={p.profitPct}
              color={T.green}
              label="Progress toward target"
              value={`${p.profitPct.toFixed(0)}%`}
            />
            <MetricDetail
              rows={[
                { label: "Current profit", value: usd(Math.round(p.currentProfit)) },
                {
                  label: "Target",
                  value: usd(p.adjustedProfitTarget),
                },
                ...(p.adjustedProfitTarget > p.profitTarget
                  ? [
                      {
                        label: "Base target",
                        value: usd(p.profitTarget),
                        muted: true,
                      },
                    ]
                  : []),
              ]}
            />
          </ProgressCard>

          <ProgressCard title="Drawdown limit">
            <MetricBar
              pct={p.drawdownConsumedPct}
              color={drawdownColor}
              label={
                p.drawdownMode === "trailing"
                  ? "Trailing drawdown consumed"
                  : "Static drawdown consumed"
              }
              value={`${p.drawdownConsumedPct.toFixed(0)}%`}
            />
            <MetricDetail
              rows={[
                {
                  label: "Current drawdown",
                  value: `${p.currentDrawdown.toFixed(1)}%`,
                },
                { label: "Max allowed", value: `${p.maxDrawdown}%` },
                { label: "Floor", value: usd(p.drawdownFloorUsd) },
              ]}
            />
          </ProgressCard>
        </div>

        {/* Trading calendar */}
        <ProgressCard title="Trading activity">
          <CalendarHeatmap
            windowDays={p.windowDays}
            windowStartDate={p.windowStartDate}
            tradedDates={p.tradedDates}
          />
          <p style={{ margin: "14px 0 0", color: T.textMuted, fontSize: 12 }}>
            {p.daysTraded} trading {p.daysTraded === 1 ? "day" : "days"} recorded
            {p.windowStartDate && p.windowEndDate
              ? ` · ${formatShortDate(p.windowStartDate)} – ${formatShortDate(p.windowEndDate)}`
              : ""}
          </p>
        </ProgressCard>

        {/* Closed trades */}
        <ProgressCard title="Closed trades">
          <ClosedTradesTable />
        </ProgressCard>
      </DashboardPage>

      {p.profitPct >= 100 && accountType === "challenge" && <CelebrationOverlay />}
    </ErrorBoundary>
  );
}

// ─── Layout primitives ────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div
      style={{
        background: T.bgSecondary,
        border: T.hairline(),
        borderRadius: T.radiusLg,
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: accent,
          marginBottom: 10,
        }}
      >
        {icon}
        <span
          style={{
            color: T.textMuted,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          color: T.textPrimary,
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div style={{ color: T.textMuted, fontSize: 12, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function ProgressCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: T.bgSecondary,
        border: T.hairline(),
        borderRadius: T.radiusLg,
        padding: "20px 22px",
      }}
    >
      <h2
        style={{
          margin: "0 0 18px",
          color: T.textPrimary,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function MetricBar({
  pct,
  color,
  label,
  value,
}: {
  pct: number;
  color: string;
  label: string;
  value: string;
}) {
  const clamped = Math.min(100, Math.max(0, pct));

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <span style={{ color: T.textSecondary, fontSize: 13 }}>{label}</span>
        <span
          style={{
            color: T.textPrimary,
            fontSize: 13,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: T.bgTertiary,
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: clamped / 100 }}
          transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          style={{
            height: "100%",
            width: "100%",
            transformOrigin: "left",
            background: color,
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  );
}

function MetricDetail({
  rows,
}: {
  rows: Array<{ label: string; value: string; muted?: boolean }>;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        borderTop: T.hairline(),
        paddingTop: 4,
      }}
    >
      {rows.map((row) => (
        <div
          key={row.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            padding: "8px 0",
          }}
        >
          <span style={{ color: T.textMuted, fontSize: 12 }}>{row.label}</span>
          <span
            style={{
              color: row.muted ? T.textMuted : T.textPrimary,
              fontSize: 12,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ─── Trading calendar ─────────────────────────────────────────────────────────

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const LEGEND = [
  { key: "traded", label: "Traded", bg: T.green },
  { key: "rest", label: "Rest day", bg: T.bgTertiary, border: true },
  { key: "today", label: "Today", ring: true },
  { key: "future", label: "Upcoming", bg: "#0D0D0D" },
] as const;

function CalendarHeatmap({
  windowDays,
  windowStartDate,
  tradedDates,
}: {
  windowDays: number;
  windowStartDate: string;
  tradedDates: string[];
}) {
  const { cells, startPad } = useMemo(() => {
    const start = windowStartDate ? new Date(windowStartDate) : new Date();
    const today = new Date().toISOString().slice(0, 10);
    const traded = new Set(tradedDates);

    const days = Array.from({ length: windowDays }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      return {
        iso,
        dayNum: d.getDate(),
        weekday: d.getDay(),
        isToday: iso === today,
        isFuture: iso > today,
        isTraded: traded.has(iso),
      };
    });

    const pad = days[0]?.weekday ?? 0;
    return { cells: days, startPad: pad };
  }, [windowDays, windowStartDate, tradedDates]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {LEGEND.map((item) => (
          <div
            key={item.key}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: "bg" in item ? item.bg : T.bgTertiary,
                border:
                  "ring" in item
                    ? `1.5px solid ${T.textPrimary}`
                    : "border" in item
                      ? T.hairline()
                      : "none",
                boxSizing: "border-box",
              }}
            />
            <span style={{ color: T.textMuted, fontSize: 11 }}>{item.label}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 6,
          maxWidth: 420,
        }}
      >
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            style={{
              color: T.textMuted,
              fontSize: 10,
              fontWeight: 500,
              textAlign: "center",
              paddingBottom: 4,
            }}
          >
            {d}
          </div>
        ))}

        {Array.from({ length: startPad }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {cells.map((sq) => (
          <div
            key={sq.iso}
            title={sq.iso}
            style={{
              aspectRatio: "1",
              minHeight: 36,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              color: sq.isTraded ? T.bgPrimary : sq.isFuture ? T.textMuted : T.textSecondary,
              background: sq.isTraded
                ? T.green
                : sq.isFuture
                  ? "#0D0D0D"
                  : T.bgTertiary,
              border: sq.isToday
                ? `1.5px solid ${T.textPrimary}`
                : sq.isTraded
                  ? "none"
                  : T.hairline(),
              boxSizing: "border-box",
            }}
          >
            {sq.dayNum}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Closed trades ────────────────────────────────────────────────────────────

const TRADE_COLUMNS = [
  "Market",
  "Direction",
  "Size",
  "Entry",
  "Exit",
  "P&L",
  "Closed",
] as const;

function ClosedTradesTable() {
  const closedTrades = usePositionStore(
    useShallow((s) => s.closedTrades),
  );

  if (closedTrades.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "32px 16px",
          color: T.textMuted,
          fontSize: 13,
        }}
      >
        No closed trades yet. Your completed positions will show up here.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", margin: "-4px -8px" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: 640,
        }}
      >
        <thead>
          <tr>
            {TRADE_COLUMNS.map((col) => (
              <th
                key={col}
                style={{
                  color: T.textMuted,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  textAlign: col === "Market" ? "left" : "right",
                  padding: "10px 12px",
                  whiteSpace: "nowrap",
                  borderBottom: T.hairline(),
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
    </div>
  );
}

function TradeRow({ trade }: { trade: ClosedTrade }) {
  const up = trade.pnl >= 0;
  const color = up ? T.green : T.red;
  const cell: React.CSSProperties = {
    padding: "12px",
    textAlign: "right",
    fontSize: 13,
    color: T.textPrimary,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    borderBottom: T.hairline(),
  };

  return (
    <tr>
      <td style={{ ...cell, textAlign: "left", maxWidth: 280 }}>
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
            fontSize: 10,
            fontWeight: 600,
            borderRadius: 4,
            padding: "2px 7px",
          }}
        >
          {trade.direction.toUpperCase()}
        </span>
      </td>
      <td style={cell}>${trade.size.toLocaleString()}</td>
      <td style={{ ...cell, color: T.textSecondary }}>{trade.entryPrice}¢</td>
      <td style={{ ...cell, color: T.textSecondary }}>{trade.exitPrice}¢</td>
      <td style={{ ...cell, color, fontWeight: 600 }}>
        {up ? "+" : "−"}${Math.abs(trade.pnl).toFixed(2)}
        <span style={{ color: T.textMuted, fontWeight: 400, marginLeft: 6 }}>
          ({up ? "+" : "−"}
          {Math.abs(trade.pnlPercent).toFixed(1)}%)
        </span>
      </td>
      <td style={{ ...cell, color: T.textSecondary, fontSize: 12 }}>
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
            href="/dashboard/billing"
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
