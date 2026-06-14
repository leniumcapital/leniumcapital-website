"use client";

import { IconClock } from "@tabler/icons-react";
import { useAccountStore } from "@/stores/accountStore";
import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import { usePositionStore } from "@/stores/positionStore";
import { StartChallengeButton } from "@/components/dashboard/StartChallengeButton";
import { fundedTargetUsd, PAYOUT_CYCLE_DAYS, resolveTierBySize } from "@/lib/data";
import { usd } from "@/lib/data";
import { T } from "@/lib/tokens";

/** Compact challenge progress card pinned to the bottom of the sidebar. */
export function ChallengeWidget() {
  const tradingMode = useAccountStore((s) => s.tradingMode);
  const challengeStatus = useAccountStore((s) => s.challengeStatus);
  const hasActiveChallenge = useAccountStore((s) => s.hasActiveChallenge);

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
      {tradingMode === "live" ? (
        <FundedState />
      ) : !hasActiveChallenge || challengeStatus === "none" ? (
        <EmptyState />
      ) : (
        <ProgressState />
      )}
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
      <StartChallengeButton fullWidth />
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
            {p.daysTraded} of {p.minTradingDays} minimum
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
        {p.timeUnlimited ? "No time limit" : `${p.daysRemaining} days remaining`}
      </div>
    </div>
  );
}

function FundedState() {
  const tierSize = useAccountStore((s) => s.tier);
  const closedTrades = usePositionStore((s) => s.closedTrades);
  const tier = resolveTierBySize(tierSize);
  const monthlyTarget = tier ? fundedTargetUsd(tier) : 0;

  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const monthlyPnl = closedTrades
    .filter((t) => t.closedAt >= monthStart)
    .reduce((sum, t) => sum + t.pnl, 0);

  const nextPayout = new Date();
  nextPayout.setDate(nextPayout.getDate() + PAYOUT_CYCLE_DAYS);

  const pct =
    monthlyTarget > 0
      ? Math.min(100, Math.max(0, (monthlyPnl / monthlyTarget) * 100))
      : 0;

  return (
    <div>
      <ProgressRow
        label="Monthly target"
        value={`$${Math.max(0, Math.round(monthlyPnl)).toLocaleString()} of ${usd(monthlyTarget)}`}
        pct={pct}
        barColor={T.green}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
          fontSize: 12,
        }}
      >
        <span style={{ color: T.textMuted }}>Monthly P&L</span>
        <span
          style={{
            color: monthlyPnl >= 0 ? T.green : T.red,
            fontWeight: 500,
          }}
        >
          {monthlyPnl >= 0 ? "+" : "−"}${Math.abs(monthlyPnl).toFixed(0)}
        </span>
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
        Next payout {nextPayout.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, Math.max(0, pct))}%`,
            background: barColor,
            borderRadius: 2,
            transition: "width 300ms ease",
          }}
        />
      </div>
    </div>
  );
}
