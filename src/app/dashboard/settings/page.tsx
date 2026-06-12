"use client";

import { useAccountStore } from "@/stores/accountStore";
import { TIERS, DEFAULT_TRADER_SPLIT_PCT, PAYOUT_CYCLE_DAYS } from "@/lib/data";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { T } from "@/lib/tokens";

export default function SettingsPage() {
  const name = useAccountStore((s) => s.name);
  const email = useAccountStore((s) => s.email);
  const tierSize = useAccountStore((s) => s.tier);
  const accountType = useAccountStore((s) => s.accountType);

  const tier = TIERS.find((t) => t.size === tierSize);

  return (
    <ErrorBoundary name="Settings">
      <div style={{ padding: 32, maxWidth: 640, fontFamily: T.font }}>
        <h1
          style={{
            margin: 0,
            color: T.textPrimary,
            fontSize: 18,
            fontWeight: 500,
          }}
        >
          Settings
        </h1>

        <Section title="Profile">
          <Field label="Full name" value={name || "—"} />
          <Field label="Email" value={email || "—"} />
        </Section>

        <Section title="Account">
          <Field
            label="Account type"
            value={
              accountType === "none"
                ? "No active challenge"
                : accountType === "funded"
                  ? "Funded account"
                  : "Demo challenge"
            }
          />
          <Field
            label="Account size"
            value={tierSize ? `$${tierSize.toLocaleString()}` : "—"}
          />
          <Field
            label="Profit split"
            value={`${DEFAULT_TRADER_SPLIT_PCT}% to you`}
          />
          <Field label="Payout cycle" value={`${PAYOUT_CYCLE_DAYS} days`} />
        </Section>

        {tier && (
          <Section title="Challenge rules">
            <Field label="Profit target" value={`${tier.profitTargetPct}%`} />
            <Field label="Max drawdown" value={`${tier.maxDrawdownPct}%`} />
            <Field label="Daily loss limit" value={`${tier.dailyLimitPct}%`} />
            <Field
              label="Max position size"
              value={`${tier.maxPositionPct}% ($${Math.round((tier.size * tier.maxPositionPct) / 100).toLocaleString()})`}
            />
            <Field
              label="Minimum trading days"
              value={`${tier.minTradingDays} days`}
            />
            <Field label="Challenge window" value={`${tier.windowDays} days`} />
          </Section>
        )}
      </div>
    </ErrorBoundary>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginTop: 24,
        background: T.bgSecondary,
        border: T.hairline(),
        borderRadius: T.radiusLg,
        padding: 20,
      }}
    >
      <div
        style={{
          color: T.green,
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: T.textMuted, fontSize: 13 }}>{label}</span>
      <span style={{ color: T.textPrimary, fontSize: 13 }}>{value}</span>
    </div>
  );
}
