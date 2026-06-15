"use client";

import { useMemo, useState } from "react";
import {
  TIERS,
  resetLineLong,
  ADDONS,
  usd,
  INACTIVITY_WARNING_DAYS,
  INACTIVITY_TERMINATE_DAYS,
  type AddonId,
} from "@/lib/data";
import { resolveRules } from "@/lib/rules";

export function RulesExplorer() {
  const [idx, setIdx] = useState(2);
  const [addons, setAddons] = useState<AddonId[]>([]);
  const tier = TIERS[idx];

  const evalRules = useMemo(
    () => resolveRules({ tier, addons, phase: "evaluation" }),
    [tier, addons],
  );
  const fundedRules = useMemo(
    () => resolveRules({ tier, addons, phase: "funded", currentBalance: tier.size }),
    [tier, addons],
  );

  const toggleAddon = (id: AddonId) => {
    setAddons((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {TIERS.map((t, i) => (
          <button
            key={t.size}
            type="button"
            onClick={() => setIdx(i)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              i === idx
                ? "border-brand bg-brand-soft text-brand-strong"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {usd(t.size)}
            {t.featured ? (
              <span className="ml-1.5 text-[10px] uppercase text-brand-strong">
                Popular
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Preview add-ons (optional)
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ADDONS.map((a) => {
            const on = addons.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleAddon(a.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  on
                    ? "border-brand bg-brand-soft text-brand-strong"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {a.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border bg-surface-muted px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Evaluation phase
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            <RuleRow
              label="Profit target"
              value={`${evalRules.profitTargetPct}% (${usd(evalRules.profitTargetUsd)})`}
            />
            <RuleRow
              label="Max drawdown"
              value={`${evalRules.maxDrawdownPct}% static floor (${usd(Math.round(tier.size * (1 - evalRules.maxDrawdownPct / 100)))})`}
            />
            <RuleRow
              label="Max position size"
              value={`${evalRules.maxPositionPct}% (${usd(evalRules.maxPositionUsd)})`}
            />
            <RuleRow
              label="Max total exposure"
              value={`${evalRules.maxExposurePct}% (${usd(evalRules.maxExposureUsd)})`}
            />
            <RuleRow
              label="Opening price range"
              value={`${evalRules.openingPriceMinCents}¢–${evalRules.openingPriceMaxCents}¢ YES`}
            />
            <RuleRow
              label="Market resolution window"
              value={`Within ${evalRules.marketResolutionWindowDays} days`}
            />
            <RuleRow
              label="Consistency rule"
              value={`${evalRules.consistencyCapPct}% per market (target adjusts up, never terminates)`}
            />
            <RuleRow
              label="Challenge window"
              value={`${evalRules.windowDays} calendar days`}
            />
            <RuleRow label="Daily loss limit" value="None" />
            <RuleRow label="Minimum trading days" value="None" />
            <RuleRow label="Reset fee" value={resetLineLong(tier)} />
          </tbody>
        </table>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border bg-surface-muted px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Funded account (live phase)
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            <RuleRow label="Profit target" value="None — no monthly or annual minimum" />
            <RuleRow label="Time limit" value="None — trade indefinitely within risk rules" />
            <RuleRow
              label="Max drawdown"
              value={`${fundedRules.maxDrawdownPct}% trailing high-water mark`}
            />
            <RuleRow
              label="Max position / exposure"
              value={`${fundedRules.maxPositionPct}% / ${fundedRules.maxExposurePct}% of current balance`}
            />
            <RuleRow
              label="Opening price range"
              value={`${fundedRules.openingPriceMinCents}¢–${fundedRules.openingPriceMaxCents}¢ YES`}
            />
            <RuleRow
              label="Market resolution window"
              value={`Within ${fundedRules.marketResolutionWindowDays} days`}
            />
            <RuleRow
              label="Default profit split"
              value={`${fundedRules.traderSplitPct}/${100 - fundedRules.traderSplitPct}`}
            />
            <RuleRow
              label="Payout cycle"
              value={`${fundedRules.payoutCycleDays} business days`}
            />
            <RuleRow
              label="Minimum payout"
              value={`2% (${usd(fundedRules.minPayoutUsd)})`}
            />
            <RuleRow
              label="Commission"
              value={`${fundedRules.commissionPct}% on opening transactions only`}
            />
            <RuleRow
              label="Consistency rule"
              value={`${fundedRules.consistencyCapPct}% per market (target adjusts, never terminates)`}
            />
            <RuleRow
              label="Inactivity policy"
              value={`Warning at ${INACTIVITY_WARNING_DAYS} days, termination at ${INACTIVITY_TERMINATE_DAYS} consecutive days`}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="w-1/2 px-5 py-3 text-muted">{label}</td>
      <td className="px-5 py-3 text-right font-semibold sm:text-left">{value}</td>
    </tr>
  );
}
