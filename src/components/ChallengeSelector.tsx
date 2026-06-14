"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast, Toaster } from "sonner";
import { Card, PillBadge } from "@/components/ui";
import {
  TIERS,
  ADDONS,
  SPLIT_ADDON_IDS,
  computePrice,
  addonPrice,
  formatUsd,
  formatPct,
  getTierBySize,
  getDefaultTier,
  parseTierParam,
  parseAddonsParam,
  buildPricingQuery,
  profitNeededUsd,
  safetyLimitUsd,
  resetSavingsUsd,
  CHALLENGE_WINDOW_DAYS,
  PAYOUT_CYCLE_DAYS,
  type AddonId,
  type PricingTier,
} from "@/lib/pricing";

type ChallengeSelectorProps = {
  isAuthenticated?: boolean;
};

export function ChallengeSelector({
  isAuthenticated = false,
}: ChallengeSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedSize, setSelectedSize] = useState(
    () => parseTierParam(searchParams.get("tier")).size,
  );
  const [selectedAddons, setSelectedAddons] = useState<AddonId[]>(() =>
    parseAddonsParam(searchParams.get("addons")),
  );
  const [checkingOut, setCheckingOut] = useState(false);

  const tier = getTierBySize(selectedSize) ?? getDefaultTier();
  const price = useMemo(
    () => computePrice(tier, selectedAddons),
    [tier, selectedAddons],
  );

  const syncUrl = useCallback(
    (size: number, addons: AddonId[]) => {
      const query = buildPricingQuery(size, addons);
      router.replace(`${pathname}?${query}`, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    syncUrl(selectedSize, selectedAddons);
  }, [selectedSize, selectedAddons, syncUrl]);

  const toggleAddon = (id: AddonId) => {
    setSelectedAddons((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);

      let next = [...prev, id];
      if (SPLIT_ADDON_IDS.includes(id)) {
        const other = SPLIT_ADDON_IDS.find((s) => s !== id && prev.includes(s));
        if (other) {
          next = next.filter((x) => x !== other);
          const addon = ADDONS.find((a) => a.id === id);
          if (addon) toast(`Switched to ${addon.name}`);
        }
      }
      return next;
    });
  };

  const handleCheckout = async () => {
    if (isAuthenticated) {
      setCheckingOut(true);
      try {
        const res = await fetch("/api/challenges/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tierSize: tier.size,
            addons: selectedAddons,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          toast.error(data.error ?? "Could not start challenge.");
          return;
        }
        toast.success(`${formatUsd(tier.size)} challenge started — good luck!`);
        router.push("/dashboard");
      } catch {
        toast.error("Something went wrong. Please try again.");
      } finally {
        setCheckingOut(false);
      }
      return;
    }

    const callbackUrl = `${pathname}?${buildPricingQuery(tier.size, selectedAddons)}`;
    router.push(
      `/signup?mode=login&callbackUrl=${encodeURIComponent(callbackUrl)}`,
    );
  };

  return (
    <>
      <Toaster position="top-center" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        {/* Left — configuration */}
        <div className="space-y-8">
          <section aria-label="Account size">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Account size
            </h2>
            <div
              className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9"
              role="tablist"
              aria-label="Account size tiers"
            >
              {TIERS.map((t) => {
                const active = t.size === selectedSize;
                return (
                  <button
                    key={t.size}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={`${formatUsd(t.size)}, ${formatUsd(t.fee)}`}
                    onClick={() => setSelectedSize(t.size)}
                    className={`rounded-xl border px-2 py-3 text-center transition-colors ${
                      active
                        ? "border-brand bg-brand-soft"
                        : "border-border bg-background hover:border-brand/40"
                    }`}
                  >
                    <div className="text-sm font-semibold tracking-tight">
                      {formatUsd(t.size)}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {formatUsd(t.fee)}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <TierRulesCard tier={tier} />

          <section aria-label="Add-ons">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                Add-ons
              </h2>
              {price.discountPct > 0 && (
                <span className="text-xs font-medium text-brand-strong">
                  {Math.round(price.discountPct * 100)}% bundle discount applied
                </span>
              )}
            </div>
            <div className="mt-3 space-y-2">
              {ADDONS.map((addon) => (
                <AddonRow
                  key={addon.id}
                  addon={addon}
                  baseFee={tier.fee}
                  selected={selectedAddons.includes(addon.id)}
                  onToggle={() => toggleAddon(addon.id)}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Right — order summary */}
        <aside className="lg:sticky lg:top-24">
          <OrderSummary
            tier={tier}
            price={price}
            checkingOut={checkingOut}
            onCheckout={handleCheckout}
          />
        </aside>
      </div>
    </>
  );
}

function TierRulesCard({ tier }: { tier: PricingTier }) {
  const profitGoal = profitNeededUsd(tier);
  const safety = safetyLimitUsd(tier);
  const savings = resetSavingsUsd(tier);

  const rules: { label: string; value: string }[] = [
    { label: "Profit target", value: formatPct(tier.profitTarget) },
    { label: "Max drawdown", value: formatPct(tier.maxDrawdown) },
    { label: "Daily loss limit", value: formatPct(tier.dailyLossLimit) },
    { label: "Min trading days", value: String(tier.minTradingDays) },
    { label: "Max position size", value: formatPct(tier.maxPositionSize) },
    { label: "Challenge window", value: `${CHALLENGE_WINDOW_DAYS} days` },
    { label: "Payout cycle", value: `${PAYOUT_CYCLE_DAYS} days` },
  ];

  return (
    <Card className="!p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight">
            {formatUsd(tier.size)}
          </h3>
          <p className="mt-1 text-sm text-muted">
            One-time fee · {formatUsd(tier.fee)}
          </p>
        </div>
        {tier.popular && <PillBadge tone="brand">Most popular</PillBadge>}
      </div>

      <dl className="mt-5 divide-y divide-border">
        {rules.map((rule) => (
          <div
            key={rule.label}
            className="flex items-center justify-between gap-4 py-3 text-sm"
          >
            <dt className="text-muted">{rule.label}</dt>
            <dd className="font-medium">{rule.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-background px-4 py-3">
          <div className="text-lg font-semibold text-brand-strong">
            {formatUsd(profitGoal)}
          </div>
          <div className="text-xs text-muted">Profit to pass</div>
        </div>
        <div className="rounded-xl border border-border bg-background px-4 py-3">
          <div className="text-lg font-semibold">{formatUsd(safety)}</div>
          <div className="text-xs text-muted">Max drawdown</div>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted">
        Reset a failed attempt for {formatUsd(tier.resetFee)} (save{" "}
        {formatUsd(savings)} vs buying fresh).
      </p>
    </Card>
  );
}

function AddonRow({
  addon,
  baseFee,
  selected,
  onToggle,
}: {
  addon: (typeof ADDONS)[number];
  baseFee: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const linePrice = addonPrice(addon, baseFee);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={selected}
      aria-label={`${addon.name}, +${formatUsd(linePrice)}`}
      onClick={onToggle}
      onKeyDown={onKeyDown}
      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
        selected
          ? "border-brand bg-brand-soft"
          : "border-border bg-background hover:border-brand/40"
      }`}
    >
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border ${
          selected
            ? "border-brand bg-brand text-[#04130b]"
            : "border-border bg-surface"
        }`}
        aria-hidden
      >
        {selected && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="font-medium">
            {addon.name}
            {addon.badge && (
              <span className="ml-1 text-brand-strong">{addon.badge}</span>
            )}
          </span>
          <span className="shrink-0 font-semibold">+{formatUsd(linePrice)}</span>
        </span>
        <span className="mt-1 block text-sm text-muted">{addon.description}</span>
      </span>
    </button>
  );
}

function OrderSummary({
  tier,
  price,
  checkingOut,
  onCheckout,
}: {
  tier: PricingTier;
  price: ReturnType<typeof computePrice>;
  checkingOut: boolean;
  onCheckout: () => void;
}) {
  const profitGoal = profitNeededUsd(tier);

  return (
    <Card aria-label="Order summary">
      <p className="text-sm text-muted">{formatUsd(tier.size)} evaluation</p>

      <div className="mt-4 space-y-2 text-sm">
        <Line label="Base fee" value={formatUsd(price.baseFee)} />
        {price.addonLines.map((line) => (
          <Line
            key={line.id}
            label={line.name}
            value={`+${formatUsd(line.price)}`}
            muted
          />
        ))}
        {price.discount > 0 && (
          <Line
            label={`Bundle (${Math.round(price.discountPct * 100)}%)`}
            value={`−${formatUsd(price.discount)}`}
            accent
          />
        )}
      </div>

      <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
        <span className="text-sm text-muted">Total today</span>
        <span className="text-3xl font-semibold tracking-tight">
          {formatUsd(price.total)}
        </span>
      </div>

      <p className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-strong">
        Hit {formatUsd(profitGoal)} profit to get funded with{" "}
        {formatUsd(tier.size)} in capital.
      </p>

      <button
        type="button"
        onClick={onCheckout}
        disabled={checkingOut}
        className="mt-4 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-[#04130b] transition-colors hover:bg-brand-strong disabled:opacity-60"
      >
        {checkingOut ? "Starting…" : `Start ${formatUsd(price.total)} challenge`}
      </button>

      <p className="mt-3 text-center text-xs text-muted">
        CFTC-regulated via Kalshi · All 50 states · One-time fee
      </p>
    </Card>
  );
}

function Line({
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
    <div className="flex items-center justify-between gap-2">
      <span className={muted ? "text-muted" : ""}>{label}</span>
      <span className={`font-medium ${accent ? "text-brand-strong" : ""}`}>
        {value}
      </span>
    </div>
  );
}
