"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { IconClock } from "@tabler/icons-react";
import { useAccountStore } from "@/stores/accountStore";
import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import { T } from "@/lib/tokens";

/** Compact challenge progress card pinned to the bottom of the sidebar. */
export function ChallengeWidget() {
  const challengeStatus = useAccountStore((s) => s.challengeStatus);

  return (
    <div
      style={{
        background: T.bgTertiary,
        border: T.hairline(),
        borderRadius: 10,
        padding: 14,
        fontFamily: T.font,
      }}
    >
      {challengeStatus === "none" ? <EmptyState /> : <ProgressState />}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "6px 0",
      }}
    >
      <span style={{ color: T.textSecondary, fontSize: 13 }}>
        No active challenge
      </span>
      <Link
        href="/dashboard/challenge/select"
        style={{
          display: "block",
          width: "100%",
          boxSizing: "border-box",
          textAlign: "center",
          background: T.green,
          color: T.bgPrimary,
          borderRadius: 6,
          padding: "8px 14px",
          fontSize: 12,
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        Start a challenge →
      </Link>
    </div>
  );
}

function ProgressState() {
  const p = useChallengeProgress();

  const drawdownColor =
    p.drawdownConsumedPct >= 90
      ? T.red
      : p.drawdownConsumedPct >= 75
        ? T.amber
        : T.green;

  return (
    <div>
      <ProgressRow
        label="Profit target"
        value={`$${Math.max(0, Math.round(p.currentProfit)).toLocaleString()} of $${p.profitTarget.toLocaleString()}`}
        pct={p.profitPct}
        barColor={T.green}
      />
      <ProgressRow
        label="Max drawdown"
        value={`${p.currentDrawdown.toFixed(1)}% of ${p.maxDrawdown}%`}
        pct={p.drawdownConsumedPct}
        barColor={drawdownColor}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: T.textMuted, fontSize: 12 }}>Days traded</span>
          <span style={{ color: T.textPrimary, fontSize: 12 }}>
            {p.daysTraded} of {p.minTradingDays} days
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {Array.from({ length: p.minTradingDays }, (_, i) => (
            <div
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: i < p.daysTraded ? T.green : T.bgPrimary,
                border: i < p.daysTraded ? "none" : T.hairline(),
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: T.textMuted,
          fontSize: 12,
        }}
      >
        <IconClock size={13} stroke={1.5} />
        {p.daysRemaining} days remaining
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  pct,
  barColor,
}: {
  label: string;
  value: string;
  pct: number;
  barColor: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: T.textMuted, fontSize: 12 }}>{label}</span>
        <span style={{ color: T.textPrimary, fontSize: 12 }}>{value}</span>
      </div>
      <div
        style={{
          background: T.border,
          height: 3,
          borderRadius: 2,
          width: "100%",
          overflow: "hidden",
        }}
      >
        <motion.div
          layout
          initial={false}
          animate={{ scaleX: Math.min(1, Math.max(0, pct / 100)) }}
          transition={{ type: "spring", stiffness: 120, damping: 24 }}
          style={{
            height: "100%",
            width: "100%",
            transformOrigin: "left",
            background: barColor,
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}
