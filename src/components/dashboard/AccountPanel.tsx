"use client";

import Link from "next/link";
import { useAccountStore } from "@/stores/accountStore";
import { useAccountRules } from "@/hooks/useAccountRules";
import { LeniumMark } from "@/components/ui/LeniumLogo";
import { DashboardCard, DashboardPage } from "@/components/dashboard/DashboardPage";
import { T } from "@/lib/tokens";
import { usd } from "@/lib/data";

export function AccountPanel() {
  const tierSize = useAccountStore((s) => s.tier);
  const accountType = useAccountStore((s) => s.accountType);
  const addons = useAccountStore((s) => s.addons);
  const commissionsPaid = useAccountStore((s) => s.commissionsPaid);
  const { rules } = useAccountRules();

  const hasActiveChallenge = accountType !== "none" && tierSize > 0;

  const accountTypeLabel =
    accountType === "none"
      ? "—"
      : accountType === "funded"
        ? "Funded account"
        : "Evaluation challenge";

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
          value={tierSize ? usd(tierSize) : "—"}
        />
        <DetailRow
          label="Profit split"
          value={
            rules
              ? `${rules.traderSplitPct}% to you`
              : hasActiveChallenge
                ? "70% to you"
                : "—"
          }
        />
        <DetailRow
          label="Payout cycle"
          value={
            rules
              ? `${rules.payoutCycleDays} business days`
              : hasActiveChallenge
                ? "7 business days"
                : "—"
          }
        />
        {rules && accountType === "funded" && (
          <>
            <DetailRow
              label="Minimum payout"
              value={usd(rules.minPayoutUsd)}
            />
            <DetailRow
              label="Opening commission"
              value={`${rules.commissionPct}%`}
            />
            <DetailRow
              label="Commissions paid"
              value={usd(Math.round(commissionsPaid))}
            />
          </>
        )}
        {addons.length > 0 && (
          <DetailRow label="Add-ons" value={addons.join(", ")} />
        )}
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

      <Link
        href="/pricing"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: T.green,
          color: T.bgPrimary,
          borderRadius: T.radius,
          padding: "10px 20px",
          fontSize: 13,
          fontWeight: 500,
          textDecoration: "none",
          fontFamily: T.font,
          transition: `opacity ${T.transition}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.9";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
      >
        Start a Challenge
      </Link>
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
