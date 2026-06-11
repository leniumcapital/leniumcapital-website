"use client";

import { useState } from "react";
import {
  TIERS,
  RULE_ROWS,
  resetLineLong,
  fundedTargetUsd,
  DEFAULT_TRADER_SPLIT_PCT,
  PAYOUT_CYCLE_DAYS,
  usd,
} from "@/lib/data";

export function RulesExplorer() {
  const [idx, setIdx] = useState(4); // default $25k
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
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {RULE_ROWS.map((r) => (
              <tr key={r.key as string}>
                <td className="w-1/2 px-5 py-3 text-muted">{r.label}</td>
                <td className="px-5 py-3 text-right font-semibold sm:text-left">
                  {r.format(tier)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="px-5 py-3 text-muted">Reset</td>
              <td className="px-5 py-3 text-right font-semibold sm:text-left">
                {resetLineLong(tier)}
              </td>
            </tr>
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
              <td className="w-1/2 px-5 py-3 text-muted">Monthly profit target</td>
              <td className="px-5 py-3 text-right font-semibold sm:text-left">
                {tier.fundedTargetPct}%/mo (${fundedTargetUsd(tier).toLocaleString()})
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-muted">Default profit split</td>
              <td className="px-5 py-3 text-right font-semibold sm:text-left">
                {DEFAULT_TRADER_SPLIT_PCT}/{100 - DEFAULT_TRADER_SPLIT_PCT} (you keep {DEFAULT_TRADER_SPLIT_PCT}%)
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-muted">Payout cycle</td>
              <td className="px-5 py-3 text-right font-semibold sm:text-left">
                {PAYOUT_CYCLE_DAYS}-day (7-day with Fast Payout)
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-muted">Risk rules</td>
              <td className="px-5 py-3 text-right font-semibold sm:text-left">
                Same as demo phase
              </td>
            </tr>
          </tbody>
        </table>
        <p className="border-t border-border px-5 py-3 text-xs text-muted">
          Funded consistency rule: no single day may exceed 50% of the monthly
          profit total. Missing a monthly target simply means no payout that
          cycle — the account stays open and profits carry forward.
        </p>
      </div>
    </div>
  );
}
