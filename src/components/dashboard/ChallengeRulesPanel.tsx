"use client";

import { useAccountStore } from "@/stores/accountStore";
import { TIERS } from "@/lib/data";
import { T } from "@/lib/tokens";

export function ChallengeRulesPanel() {
  const tierSize = useAccountStore((s) => s.tier);
  const accountType = useAccountStore((s) => s.accountType);
  const tier = TIERS.find((t) => t.size === tierSize);

  if (accountType === "none" || !tier) {
    return (
      <div style={{ padding: 32, maxWidth: 640, fontFamily: T.font }}>
        <h1
          style={{
            margin: 0,
            color: T.textPrimary,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          Challenge rules
        </h1>
        <p style={{ marginTop: 16, fontSize: 14, color: T.textMuted }}>
          Start a challenge to see your tier-specific rules here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 640, fontFamily: T.font }}>
      <h1
        style={{
          margin: 0,
          color: T.textPrimary,
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}
      >
        Challenge rules
      </h1>
      <p style={{ marginTop: 8, marginBottom: 28, fontSize: 14, color: T.textMuted }}>
        Rules for your ${tier.size.toLocaleString()} evaluation account.
      </p>

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
          Your tier
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Row label="Profit target" value={`${tier.profitTargetPct}%`} />
          <Row label="Max drawdown" value={`${tier.maxDrawdownPct}%`} />
          <Row label="Daily loss limit" value={`${tier.dailyLimitPct}%`} />
          <Row
            label="Max position size"
            value={`${tier.maxPositionPct}% ($${Math.round((tier.size * tier.maxPositionPct) / 100).toLocaleString()})`}
          />
          <Row label="Minimum trading days" value={`${tier.minTradingDays} days`} />
          <Row label="Challenge window" value={`${tier.windowDays} days`} />
          <Row label="Consistency cap" value={`${tier.consistencyCapPct}%`} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      <span style={{ color: T.textMuted, fontSize: 13 }}>{label}</span>
      <span style={{ color: T.textPrimary, fontSize: 13, textAlign: "right" }}>{value}</span>
    </div>
  );
}
