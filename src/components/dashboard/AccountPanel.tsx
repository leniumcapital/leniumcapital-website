"use client";

import { useAccountStore } from "@/stores/accountStore";
import { DEFAULT_TRADER_SPLIT_PCT, PAYOUT_CYCLE_DAYS } from "@/lib/data";
import { LeniumMark } from "@/components/ui/LeniumLogo";
import { StartChallengeButton } from "@/components/dashboard/StartChallengeButton";
import { DashboardCard, DashboardPage } from "@/components/dashboard/DashboardPage";
import { T } from "@/lib/tokens";

export function AccountPanel() {
  const tierSize = useAccountStore((s) => s.tier);
  const accountType = useAccountStore((s) => s.accountType);

  const hasActiveChallenge = accountType !== "none" && tierSize > 0;

  const accountTypeLabel =
    accountType === "none"
      ? "—"
      : accountType === "funded"
        ? "Funded account"
        : "Demo challenge";

  return (
    <DashboardPage title="Account" maxWidth={800}>
      {!hasActiveChallenge && <StartChallengeBanner />}

      <DashboardCard title="Account details">
        <DetailRow
          label="Account type"
          value={hasActiveChallenge ? accountTypeLabel : "—"}
          badge={hasActiveChallenge ? "Active" : undefined}
        />
        <DetailRow
          label="Account size"
          value={tierSize ? `$${tierSize.toLocaleString()}` : "—"}
        />
        <DetailRow
          label="Profit split"
          value={hasActiveChallenge ? `${DEFAULT_TRADER_SPLIT_PCT}% to you` : "—"}
        />
        <DetailRow
          label="Payout cycle"
          value={hasActiveChallenge ? `${PAYOUT_CYCLE_DAYS} days` : "—"}
        />
      </DashboardCard>
    </DashboardPage>
  );
}

function StartChallengeBanner() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        padding: "20px 24px",
        background: T.bgSecondary,
        border: `0.5px solid ${T.greenMutedBorder}`,
        borderRadius: T.radiusLg,
        boxShadow: `inset 0 0 0 1px ${T.greenMutedBg}`,
      }}
    >
      <LeniumMark size={40} variant="green" />

      <div style={{ flex: "1 1 220px", minWidth: 0, textAlign: "center" }}>
        <div
          style={{
            color: T.textPrimary,
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            lineHeight: 1.35,
          }}
        >
          Ready to start trading?
        </div>
        <div style={{ color: T.textMuted, fontSize: 13, marginTop: 4 }}>
          Begin your challenge today
        </div>
      </div>

      <StartChallengeButton
        style={{
          flexShrink: 0,
          borderRadius: T.radius,
          padding: "10px 20px",
          fontSize: 13,
        }}
      >
        Start a Challenge
      </StartChallengeButton>
    </div>
  );
}

function DetailRow({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 0",
        borderBottom: T.hairline(),
      }}
    >
      <span style={{ color: T.textMuted, fontSize: 13 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {badge && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: T.green,
              background: T.greenMutedBg,
              border: `0.5px solid ${T.greenMutedBorder}`,
              borderRadius: T.radiusPill,
              padding: "3px 8px",
            }}
          >
            {badge}
          </span>
        )}
        <span
          style={{
            color: value === "—" ? T.textMuted : T.textPrimary,
            fontSize: 13,
            fontWeight: value === "—" ? 400 : 500,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
