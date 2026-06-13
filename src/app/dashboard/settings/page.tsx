"use client";

import { useAccountStore } from "@/stores/accountStore";
import { TIERS } from "@/lib/data";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { DashboardCard, DashboardPage } from "@/components/dashboard/DashboardPage";
import { T } from "@/lib/tokens";

export default function SettingsPage() {
  const tierSize = useAccountStore((s) => s.tier);
  const tier = TIERS.find((t) => t.size === tierSize);

  return (
    <ErrorBoundary name="Settings">
      <DashboardPage title="Settings">
        {tier ? (
          <DashboardCard title="Challenge rules">
            <RuleRow label="Profit target" value={`${tier.profitTargetPct}%`} />
            <RuleRow label="Max drawdown" value={`${tier.maxDrawdownPct}%`} />
            <RuleRow label="Daily loss limit" value={`${tier.dailyLimitPct}%`} />
            <RuleRow
              label="Max position size"
              value={`${tier.maxPositionPct}% ($${Math.round((tier.size * tier.maxPositionPct) / 100).toLocaleString()})`}
            />
            <RuleRow label="Minimum trading days" value={`${tier.minTradingDays} days`} />
            <RuleRow label="Challenge window" value={`${tier.windowDays} days`} />
          </DashboardCard>
        ) : (
          <div
            style={{
              background: T.bgSecondary,
              border: T.hairline(),
              borderRadius: T.radiusLg,
              padding: 24,
              color: T.textMuted,
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            Challenge rules appear here once you start a challenge. Visit{" "}
            <a href="/dashboard/account" style={{ color: T.green, textDecoration: "none" }}>
              Account
            </a>{" "}
            to get started.
          </div>
        )}
      </DashboardPage>
    </ErrorBoundary>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        padding: "10px 0",
        borderBottom: T.hairline(),
      }}
    >
      <span style={{ color: T.textMuted, fontSize: 13 }}>{label}</span>
      <span style={{ color: T.textPrimary, fontSize: 13 }}>{value}</span>
    </div>
  );
}
