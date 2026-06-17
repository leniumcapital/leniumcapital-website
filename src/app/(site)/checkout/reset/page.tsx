"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Container } from "@/components/ui";
import {
  TIERS,
  usd,
  resetSavingsUsd,
  resetCheckoutTitle,
} from "@/lib/pricing";

export default function ResetCheckoutPage() {
  const defaultIdx = TIERS.findIndex((t) => t.size === 25_000);
  const [idx, setIdx] = useState(defaultIdx >= 0 ? defaultIdx : 0);
  const [checkingOut, setCheckingOut] = useState(false);
  const router = useRouter();
  const tier = TIERS[idx];

  async function handleCheckout() {
    setCheckingOut(true);
    try {
      const res = await fetch("/api/billing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierSize: tier.size,
          addons: [],
          planType: "reset",
        }),
      });
      const data = (await res.json()) as { error?: string; order?: { orderId: string } };

      if (res.status === 401) {
        router.push(
          `/signup?mode=login&callbackUrl=${encodeURIComponent("/checkout/reset")}`,
        );
        return;
      }

      if (!res.ok) {
        toast.error(data.error ?? "Could not create reset order.");
        return;
      }

      toast.success("Reset order created — complete payment in Billing.");
      router.push("/dashboard/billing");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <section className="py-14">
      <Container className="max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight">Reset checkout</h1>
        <p className="mt-2 text-muted">
          Restart a failed or expired challenge at the same tier for the
          discounted reset fee.
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

        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-semibold">{resetCheckoutTitle(tier)}</h2>
          </div>
          <div className="space-y-3 px-6 py-5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Original fee</span>
              <span className="font-medium">{usd(tier.fee)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Reset discount</span>
              <span className="font-medium text-brand-strong">
                −{usd(resetSavingsUsd(tier))}
              </span>
            </div>
            <div className="flex items-end justify-between border-t border-border pt-3">
              <span className="text-muted">Total charged today</span>
              <span className="text-2xl font-semibold tracking-tight">
                {usd(tier.resetFee)}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={checkingOut}
          onClick={() => void handleCheckout()}
          className="mt-5 block w-full rounded-xl bg-brand py-3 text-center text-sm font-semibold text-[#04130b] transition-colors hover:bg-brand-strong disabled:opacity-60"
        >
          {checkingOut ? "Creating order…" : `Pay ${usd(tier.resetFee)} & restart`}
        </button>
      </Container>
    </section>
  );
}
