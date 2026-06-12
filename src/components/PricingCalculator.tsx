"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  TIERS,
  ADDONS,
  SPLIT_ADDONS,
  computePrice,
  addonPrice,
  usd,
  type AddonId,
} from "@/lib/data";

export function PricingCalculator() {
  const [sizeIdx, setSizeIdx] = useState(1); // default $10k
  const [selected, setSelected] = useState<AddonId[]>([]);

  const tier = TIERS[sizeIdx];

  const toggle = (id: AddonId) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      let next = [...prev, id];
      // The two profit-split upgrades are mutually exclusive.
      if (SPLIT_ADDONS.includes(id)) {
        next = next.filter((x) => x === id || !SPLIT_ADDONS.includes(x));
      }
      return next;
    });
  };

  const price = useMemo(() => computePrice(tier, selected), [tier, selected]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* Controls */}
      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Account size
          </h3>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-3">
            {TIERS.map((t, i) => (
              <button
                key={t.size}
                type="button"
                onClick={() => setSizeIdx(i)}
                className={`relative rounded-xl border px-3 py-3 text-center transition-colors ${
                  i === sizeIdx
                    ? "border-brand bg-brand-soft"
                    : "border-border hover:border-brand/40"
                }`}
              >
                <div className="text-base font-semibold tracking-tight">
                  {usd(t.size)}
                </div>
                <div className="text-xs text-muted">${t.baseFee}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Add-ons
          </h3>
          <div className="mt-3 space-y-2">
            {ADDONS.map((a) => {
              const isOn = selected.includes(a.id);
              const disabledBySplit =
                SPLIT_ADDONS.includes(a.id) &&
                !isOn &&
                selected.some(
                  (x) => SPLIT_ADDONS.includes(x) && x !== a.id
                );
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggle(a.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                    isOn
                      ? "border-brand bg-brand-soft"
                      : "border-border hover:border-brand/40"
                  } ${disabledBySplit ? "opacity-50" : ""}`}
                >
                  <span
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border ${
                      isOn
                        ? "border-brand bg-brand text-[#04130b]"
                        : "border-border"
                    }`}
                  >
                    {isOn && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{a.name}</span>
                      <span className="font-semibold">
                        {addonPrice(a, tier.baseFee) === 0
                          ? "—"
                          : `+$${addonPrice(a, tier.baseFee)}`}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">
                      {a.blurb}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-20 h-fit">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="text-sm text-muted">
            {usd(tier.size)} evaluation account
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <Row label="Base challenge fee" value={`$${price.baseFee}`} />
            {price.addonLines.map((l) => (
              <Row key={l.id} label={l.name} value={`+$${l.price}`} muted />
            ))}
            {price.discount > 0 && (
              <Row
                label={`Bundle discount (${Math.round(price.discountPct * 100)}%)`}
                value={`−$${price.discount}`}
                accent
              />
            )}
          </div>

          <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
            <span className="text-sm text-muted">Total today</span>
            <span className="text-3xl font-semibold tracking-tight">
              ${price.total}
            </span>
          </div>

          <div className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand-strong">
            Hit your $
            {Math.round(
              (tier.size * tier.profitTargetPct) / 100
            ).toLocaleString()}{" "}
            profit goal to get funded with {usd(tier.size)} in capital
          </div>

          <Link
            href="/signup"
            className="mt-4 block w-full rounded-xl bg-brand py-3 text-center text-sm font-semibold text-[#04130b] transition-colors hover:bg-brand-strong"
          >
            Start {usd(tier.size)} challenge
          </Link>
          <p className="mt-2 text-center text-xs text-muted">
            Free to create an account — you only pay when you start.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted" : ""}>{label}</span>
      <span
        className={`font-medium ${accent ? "text-brand-strong" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

