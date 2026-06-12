"use client";

import Link from "next/link";
import { useState } from "react";
import { Container } from "@/components/ui";
import {
  TIERS,
  usd,
  resetFee,
  resetSavings,
  resetCheckoutTitle,
} from "@/lib/data";

export default function ResetCheckoutPage() {
  // Default to the $35,000 tier, where the reset fee collides with the
  // $25,000 base fee and the account size must be stated explicitly.
  const [idx, setIdx] = useState(5);
  const tier = TIERS[idx];

  return (
    <section className="py-14">
      <Container className="max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight">Reset checkout</h1>
        <p className="mt-2 text-muted">
          Restart a failed challenge at the same tier for 25% off the original
          fee.
        </p>

        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Account size
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {TIERS.map((t, i) => (
              <button
                key={t.size}
                type="button"
                onClick={() => setIdx(i)}
                className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold transition-colors ${
                  i === idx
                    ? "border-brand bg-brand-soft text-brand-strong"
                    : "border-border hover:border-brand/40"
                }`}
              >
                {usd(t.size)}
              </button>
            ))}
          </div>
        </div>

        {/* Order summary */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-semibold">{resetCheckoutTitle(tier)}</h2>
          </div>
          <div className="space-y-3 px-6 py-5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Original fee</span>
              <span className="font-medium">{usd(tier.baseFee)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Reset discount</span>
              <span className="font-medium text-brand-strong">
                −{usd(resetSavings(tier))}
              </span>
            </div>
            <div className="flex items-end justify-between border-t border-border pt-3">
              <span className="text-muted">Total charged today</span>
              <span className="text-2xl font-semibold tracking-tight">
                {usd(resetFee(tier))}
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/signup"
          className="mt-5 block w-full rounded-xl bg-brand py-3 text-center text-sm font-semibold text-[#04130b] transition-colors hover:bg-brand-strong"
        >
          Pay {usd(resetFee(tier))} & restart
        </Link>
      </Container>
    </section>
  );
}
