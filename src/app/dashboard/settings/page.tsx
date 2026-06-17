"use client";

import { useAccountStore } from "@/stores/accountStore";
import { useAccountRules } from "@/hooks/useAccountRules";
import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { DashboardCard, DashboardPage } from "@/components/dashboard/DashboardPage";
import { T } from "@/lib/tokens";
import { usd, ADDONS } from "@/lib/pricing";

export default function SettingsPage() {
  const accountType = useAccountStore((s) => s.accountType);
  const addons = useAccountStore((s) => s.addons);
  const { rules } = useAccountRules();
  const progress = useChallengeProgress();

  return (
    <ErrorBoundary name="Settings">
      <DashboardPage title="Settings">
        {rules ? (
          <>
            <DashboardCard
              title={
                accountType === "funded"
                  ? "Funded account rules"
                  : "Evaluation rules"
              }
            >
              {accountType === "challenge" && (
                <>
                  <RuleRow
                    label="Profit target"
                    value={`${rules.profitTargetPct}% (${usd(rules.profitTargetUsd)})`}
                  />
                  {progress.adjustedProfitTarget > progress.profitTarget && (
                    <RuleRow
                      label="Adjusted target (consistency)"
                      value={usd(progress.adjustedProfitTarget)}
                    />
                  )}
                  <RuleRow
                    label="Challenge window"
                    value={`${rules.windowDays} calendar days`}
                  />
                </>
              )}
              <RuleRow
                label="Max drawdown"
                value={`${rules.maxDrawdownPct}% ${rules.drawdownMode} floor (${usd(progress.drawdownFloorUsd)})`}
              />
              <RuleRow label="Daily loss limit" value="None" />
              <RuleRow
                label="Max position size"
                value={`${rules.maxPositionPct}% (${usd(rules.maxPositionUsd)})`}
              />
              <RuleRow
                label="Max total exposure"
                value={`${rules.maxExposurePct}% (${usd(rules.maxExposureUsd)})`}
              />
              <RuleRow
                label="Opening price range"
                value={`${rules.openingPriceMinCents}¢–${rules.openingPriceMaxCents}¢ YES`}
              />
              <RuleRow
                label="Market resolution window"
                value={`${rules.marketResolutionWindowDays} days`}
              />
              <RuleRow
                label="Consistency rule"
                value={`${rules.consistencyCapPct}% per market (adjusts target, never terminates)`}
              />
              <RuleRow label="Minimum trading days" value="None" />
              {accountType === "funded" && (
                <>
                  <RuleRow
                    label="Profit split"
                    value={`${rules.traderSplitPct}/${100 - rules.traderSplitPct}`}
                  />
                  <RuleRow
                    label="Payout cycle"
                    value={`${rules.payoutCycleDays} business days`}
                  />
                  <RuleRow
                    label="Minimum payout"
                    value={usd(rules.minPayoutUsd)}
                  />
                  <RuleRow
                    label="Opening commission"
                    value={`${rules.commissionPct}%`}
                  />
                  <RuleRow
                    label="Inactivity policy"
                    value="30 days (warning at 20)"
                  />
                </>
              )}
            </DashboardCard>

            {addons.length > 0 && (
              <DashboardCard title="Active add-ons">
                {addons.map((id) => {
                  const addon = ADDONS.find((a) => a.id === id);
                  return (
                    <RuleRow
                      key={id}
                      label={addon?.name ?? id}
                      value="Active"
                    />
                  );
                })}
              </DashboardCard>
            )}
          </>
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
      <span style={{ color: T.textPrimary, fontSize: 13, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}
