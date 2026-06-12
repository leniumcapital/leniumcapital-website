"use client";

import { useAccountStore } from "@/stores/accountStore";
import { DEFAULT_TRADER_SPLIT_PCT, PAYOUT_CYCLE_DAYS } from "@/lib/data";
import { T } from "@/lib/tokens";

export function AccountInfoPanel() {
  const tierSize = useAccountStore((s) => s.tier);
  const accountType = useAccountStore((s) => s.accountType);

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
        Trading account
      </h1>
      <p style={{ marginTop: 8, marginBottom: 28, fontSize: 14, color: T.textMuted }}>
        Your active evaluation or funded account details.
      </p>

      <Panel title="Account overview">
        <Row
          label="Account type"
          value={
            accountType === "none"
              ? "No active challenge"
              : accountType === "funded"
                ? "Funded account"
                : "Demo challenge"
          }
        />
        <Row
          label="Account size"
          value={tierSize ? `$${tierSize.toLocaleString()}` : "—"}
        />
        <Row label="Profit split" value={`${DEFAULT_TRADER_SPLIT_PCT}% to you`} />
        <Row label="Payout cycle" value={`${PAYOUT_CYCLE_DAYS} days`} />
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      <span style={{ color: T.textMuted, fontSize: 13 }}>{label}</span>
      <span style={{ color: T.textPrimary, fontSize: 13, textAlign: "right" }}>{value}</span>
    </div>
  );
}
