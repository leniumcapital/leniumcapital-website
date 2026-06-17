"use client";

import { useAccountStore } from "@/stores/accountStore";
import { resolveRulesForAccount, formatRulePct } from "@/lib/rules";
import { T } from "@/lib/tokens";

export function ChallengeRulesPanel() {
  const tierSize = useAccountStore((s) => s.tier);
  const accountType = useAccountStore((s) => s.accountType);
  const addons = useAccountStore((s) => s.addons);
  const rules = resolveRulesForAccount({
    accountType,
    accountSize: tierSize,
    addons,
  });

  if (accountType === "none" || !rules) {
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
        Effective rules for your ${rules.tierSize.toLocaleString()} evaluation account
        {addons.length > 0 ? " (including purchased add-ons)" : ""}.
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
          Your effective limits
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Row
            label="Profit target"
            value={`${formatRulePct(rules.profitTargetPct)}% ($${rules.profitTargetUsd.toLocaleString()})`}
          />
          <Row
            label="Max drawdown"
            value={`${formatRulePct(rules.maxDrawdownPct)}%`}
          />
          <Row label="Daily loss limit" value="None" />
          <Row
            label="Max position size"
            value={`${formatRulePct(rules.maxPositionPct)}% ($${rules.maxPositionUsd.toLocaleString()})`}
          />
          <Row
            label="Max total exposure"
            value={`${formatRulePct(rules.maxExposurePct)}% ($${rules.maxExposureUsd.toLocaleString()})`}
          />
          <Row label="Minimum trading days" value="None" />
          <Row label="Challenge window" value={`${rules.windowDays} days`} />
          <Row
            label="Consistency cap"
            value={`${formatRulePct(rules.consistencyCapPct)}% per market`}
          />
          <Row
            label="Profit split (when funded)"
            value={`${rules.traderSplitPct}/${100 - rules.traderSplitPct}`}
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 14 }}>
      <span style={{ color: T.textMuted }}>{label}</span>
      <span style={{ color: T.textPrimary, textAlign: "right" }}>{value}</span>
    </div>
  );
}
