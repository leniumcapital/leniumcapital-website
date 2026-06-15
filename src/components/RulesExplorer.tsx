"use client";

import { useState } from "react";
import {
  TIERS,
  RULE_ROWS,
  PLATFORM_RULES,
  resetLineLong,
  DEFAULT_TRADER_SPLIT_PCT,
  PAYOUT_CYCLE_DAYS,
  FAST_PAYOUT_CYCLE_DAYS,
  FUNDED_CONSISTENCY_CAP_PCT,
  FUNDED_COMMISSION_PCT,
  MIN_PAYOUT_PCT,
  usd,
  minPayoutUsd,
} from "@/lib/data";

export function RulesExplorer() {
  const [idx, setIdx] = useState(2); // default $25k
  const tier = TIERS[idx];

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

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {RULE_ROWS.map((r) => (
              <tr key={r.label}>
                <td className="w-1/2 px-5 py-3 text-muted">{r.label}</td>
                <td className="px-5 py-3 text-right font-semibold sm:text-left">
                  {r.format(tier)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="px-5 py-3 text-muted">Reset fee</td>
              <td className="px-5 py-3 text-right font-semibold sm:text-left">
                {resetLineLong(tier)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border bg-surface-muted px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Rules removed
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {PLATFORM_RULES.map((r) => (
              <tr key={r.label}>
                <td className="w-1/2 px-5 py-3 text-muted">{r.label}</td>
                <td className="px-5 py-3 text-right font-semibold sm:text-left">
                  {r.format(tier)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border bg-surface-muted px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Funded account (live phase)
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            <tr>
              <td className="w-1/2 px-5 py-3 text-muted">Profit target</td>
              <td className="px-5 py-3 text-right font-semibold sm:text-left">
                None — no monthly or annual minimum
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-muted">Time limit</td>
              <td className="px-5 py-3 text-right font-semibold sm:text-left">
                None — trade indefinitely within risk rules
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-muted">Max drawdown</td>
              <td className="px-5 py-3 text-right font-semibold sm:text-left">
                10% trailing high-water mark
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-muted">Default profit split</td>
              <td className="px-5 py-3 text-right font-semibold sm:text-left">
                {DEFAULT_TRADER_SPLIT_PCT}/{100 - DEFAULT_TRADER_SPLIT_PCT} (90/10
                with add-on)
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-muted">Payout cycle</td>
              <td className="px-5 py-3 text-right font-semibold sm:text-left">
                {PAYOUT_CYCLE_DAYS} business days ({FAST_PAYOUT_CYCLE_DAYS}-day
                with Fast Payout add-on)
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-muted">Minimum payout</td>
              <td className="px-5 py-3 text-right font-semibold sm:text-left">
                {MIN_PAYOUT_PCT}% ({usd(minPayoutUsd(tier))})
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-muted">Commission</td>
              <td className="px-5 py-3 text-right font-semibold sm:text-left">
                {FUNDED_COMMISSION_PCT}% on opening transactions only
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-muted">Consistency rule</td>
              <td className="px-5 py-3 text-right font-semibold sm:text-left">
                {FUNDED_CONSISTENCY_CAP_PCT}% per market (target adjusts, never
                terminates)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
