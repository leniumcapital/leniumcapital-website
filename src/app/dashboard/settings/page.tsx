"use client";

import { useAccountStore } from "@/stores/accountStore";
import { TIERS, DEFAULT_TRADER_SPLIT_PCT, PAYOUT_CYCLE_DAYS } from "@/lib/data";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { T } from "@/lib/tokens";

export default function SettingsPage() {
  const tierSize = useAccountStore((s) => s.tier);
  const accountType = useAccountStore((s) => s.accountType);
  const tier = TIERS.find((t) => t.size === tierSize);

  return (
    <ErrorBoundary name="Settings">
      <div style={{ padding: 32, maxWidth: 720, fontFamily: T.font }}>
        <h1
          style={{
            margin: 0,
            color: T.textPrimary,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          Settings
        </h1>
        <p style={{ marginTop: 8, marginBottom: 28, fontSize: 14, color: T.textMuted }}>
          Manage your profile, contact details, and account preferences.
        </p>

        <SettingsForm />

        <AccountSection accountType={accountType} tierSize={tierSize} tier={tier} />
      </div>
    </ErrorBoundary>
  );
}

function AccountSection({
  accountType,
  tierSize,
  tier,
}: {
  accountType: string;
  tierSize: number;
  tier: (typeof TIERS)[number] | undefined;
}) {
  return (
    <>
      <div style={{ marginTop: 32 }}>
        <ReadOnlySection title="Trading account">
          <ReadOnlyField
            label="Account type"
            value={
              accountType === "none"
                ? "No active challenge"
                : accountType === "funded"
                  ? "Funded account"
                  : "Demo challenge"
            }
          />
          <ReadOnlyField
            label="Account size"
            value={tierSize ? `$${tierSize.toLocaleString()}` : "—"}
          />
          <ReadOnlyField
            label="Profit split"
            value={`${DEFAULT_TRADER_SPLIT_PCT}% to you`}
          />
          <ReadOnlyField label="Payout cycle" value={`${PAYOUT_CYCLE_DAYS} days`} />
        </ReadOnlySection>
      </div>

      {tier && (
        <div style={{ marginTop: 24 }}>
          <ReadOnlySection title="Challenge rules">
            <ReadOnlyField label="Profit target" value={`${tier.profitTargetPct}%`} />
            <ReadOnlyField label="Max drawdown" value={`${tier.maxDrawdownPct}%`} />
            <ReadOnlyField label="Daily loss limit" value={`${tier.dailyLimitPct}%`} />
            <ReadOnlyField
              label="Max position size"
              value={`${tier.maxPositionPct}% ($${Math.round((tier.size * tier.maxPositionPct) / 100).toLocaleString()})`}
            />
            <ReadOnlyField
              label="Minimum trading days"
              value={`${tier.minTradingDays} days`}
            />
            <ReadOnlyField label="Challenge window" value={`${tier.windowDays} days`} />
          </ReadOnlySection>
        </div>
      )}
    </>
  );
}

function ReadOnlySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
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
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: T.textMuted, fontSize: 13 }}>{label}</span>
      <span style={{ color: T.textPrimary, fontSize: 13 }}>{value}</span>
    </div>
  );
}
