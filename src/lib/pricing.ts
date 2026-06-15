/**
 * Challenge pricing — single source of truth for tiers, add-ons, and totals.
 * Every number shown on /pricing and /dashboard/challenge/select comes from here.
 */

export type PricingTier = {
  size: number;
  fee: number;
  resetFee: number;
  /** Profit target as a decimal (0.20 = 20%). */
  profitTarget: number;
  maxDrawdown: number;
  maxPositionSize: number;
  maxExposure: number;
  popular: boolean;
  exclusive?: boolean;
};

export type AddonId =
  | "90split"
  | "drawdown"
  | "consistency"
  | "doubletime"
  | "fastpayout";

export type Addon = {
  id: AddonId;
  name: string;
  description: string;
  priceType: "percent" | "flat";
  priceValue: number;
  exclusive: boolean;
  badge: string | null;
};

export const CHALLENGE_WINDOW_DAYS = 30;
export const PAYOUT_CYCLE_DAYS = 7;
export const FAST_PAYOUT_CYCLE_DAYS = 3;

export const DEFAULT_TIER_SIZE = 25_000;

/** Account sizes available for new challenge purchases. */
export const PURCHASABLE_TIER_SIZES = [
  5_000, 10_000, 25_000, 50_000, 75_000, 100_000,
] as const;

/** Retired tiers — existing accounts keep access; new purchases are rejected. */
export const DEPRECATED_TIER_SIZES = [15_000, 20_000, 35_000] as const;

export const TIERS: PricingTier[] = [
  {
    size: 5_000,
    fee: 65,
    resetFee: 49,
    profitTarget: 0.2,
    maxDrawdown: 0.1,
    maxPositionSize: 0.05,
    maxExposure: 0.1,
    popular: false,
  },
  {
    size: 10_000,
    fee: 119,
    resetFee: 89,
    profitTarget: 0.2,
    maxDrawdown: 0.1,
    maxPositionSize: 0.05,
    maxExposure: 0.1,
    popular: false,
  },
  {
    size: 25_000,
    fee: 249,
    resetFee: 187,
    profitTarget: 0.2,
    maxDrawdown: 0.1,
    maxPositionSize: 0.05,
    maxExposure: 0.1,
    popular: true,
  },
  {
    size: 50_000,
    fee: 529,
    resetFee: 397,
    profitTarget: 0.2,
    maxDrawdown: 0.1,
    maxPositionSize: 0.05,
    maxExposure: 0.1,
    popular: false,
  },
  {
    size: 75_000,
    fee: 729,
    resetFee: 547,
    profitTarget: 0.2,
    maxDrawdown: 0.1,
    maxPositionSize: 0.05,
    maxExposure: 0.1,
    popular: false,
    exclusive: true,
  },
  {
    size: 100_000,
    fee: 999,
    resetFee: 749,
    profitTarget: 0.2,
    maxDrawdown: 0.1,
    maxPositionSize: 0.05,
    maxExposure: 0.1,
    popular: false,
  },
];

export const ADDONS: Addon[] = [
  {
    id: "90split",
    name: "90% profit split",
    description:
      "Raises the funded profit split from 70/30 to 90/10 permanently — the maximum split available from any CFTC-regulated prediction market prop firm.",
    priceType: "percent",
    priceValue: 0.5,
    exclusive: true,
    badge: null,
  },
  {
    id: "drawdown",
    name: "Drawdown boost",
    description:
      "Raises max drawdown to 15%, max total exposure to 15%, and max single position to 7.5% on both evaluation and funded accounts.",
    priceType: "percent",
    priceValue: 0.65,
    exclusive: false,
    badge: null,
  },
  {
    id: "consistency",
    name: "Consistency boost",
    description:
      "Raises the consistency threshold from 15% to 25% during evaluation and from 20% to 30% on the funded account.",
    priceType: "percent",
    priceValue: 0.2,
    exclusive: false,
    badge: null,
  },
  {
    id: "doubletime",
    name: "Double time",
    description:
      "Extends the evaluation window from 30 to 60 calendar days. No other rules change.",
    priceType: "percent",
    priceValue: 0.09,
    exclusive: false,
    badge: null,
  },
  {
    id: "fastpayout",
    name: "3-day fast payout",
    description:
      "Reduces payout processing from 7 business days to 3 business days on every funded payout permanently.",
    priceType: "flat",
    priceValue: 39,
    exclusive: false,
    badge: "★",
  },
];

/** Profit-split add-ons are mutually exclusive (only one split tier). */
export const SPLIT_ADDON_IDS: AddonId[] = ["90split"];

export function getTierBySize(size: number): PricingTier | undefined {
  return TIERS.find((t) => t.size === size);
}

export function getDefaultTier(): PricingTier {
  return getTierBySize(DEFAULT_TIER_SIZE) ?? TIERS[2];
}

export function isPurchasableTierSize(size: number): boolean {
  return PURCHASABLE_TIER_SIZES.includes(
    size as (typeof PURCHASABLE_TIER_SIZES)[number],
  );
}

export function isDeprecatedTierSize(size: number): boolean {
  return DEPRECATED_TIER_SIZES.includes(
    size as (typeof DEPRECATED_TIER_SIZES)[number],
  );
}

export function addonPrice(addon: Addon, baseFee: number): number {
  if (addon.priceType === "flat") return addon.priceValue;
  return Math.round(addon.priceValue * baseFee);
}

export function bundleDiscountPct(count: number): number {
  if (count >= 5) return 0.18;
  if (count === 4) return 0.15;
  if (count === 3) return 0.12;
  if (count === 2) return 0.1;
  return 0;
}

export type PriceBreakdown = {
  baseFee: number;
  addonLines: { id: AddonId; name: string; price: number }[];
  addonSubtotal: number;
  discountPct: number;
  discount: number;
  total: number;
};

export function computePrice(
  tier: PricingTier,
  selected: AddonId[],
): PriceBreakdown {
  const addonLines = ADDONS.filter((a) => selected.includes(a.id)).map((a) => ({
    id: a.id,
    name: a.name,
    price: addonPrice(a, tier.fee),
  }));
  const addonSubtotal = addonLines.reduce((s, l) => s + l.price, 0);
  const discountPct = bundleDiscountPct(selected.length);
  const discount = Math.round(addonSubtotal * discountPct);
  const total = tier.fee + addonSubtotal - discount;

  return {
    baseFee: tier.fee,
    addonLines,
    addonSubtotal,
    discountPct,
    discount,
    total,
  };
}

export function profitNeededUsd(tier: PricingTier): number {
  return Math.round(tier.size * tier.profitTarget);
}

export function safetyLimitUsd(tier: PricingTier): number {
  return Math.round(tier.size * tier.maxDrawdown);
}

export function resetSavingsUsd(tier: PricingTier): number {
  return tier.fee - tier.resetFee;
}

export function formatUsd(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/** Compact tier label for selector buttons, e.g. 5000 -> "$5K". */
export function formatTierCompact(size: number): string {
  return `$${size / 1000}K`;
}

export function formatPct(decimal: number): string {
  const pct = decimal * 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

export function parseTierParam(value: string | null): PricingTier {
  const size = Number(value);
  return getTierBySize(size) ?? getDefaultTier();
}

export function parseAddonsParam(value: string | null): AddonId[] {
  if (!value) return [];
  const legacy: Record<string, AddonId> = {
    split90: "90split",
    split95: "90split",
  };
  const valid = new Set(ADDONS.map((a) => a.id));
  return value
    .split(",")
    .map((s) => s.trim())
    .map((id) => legacy[id] ?? id)
    .filter((id): id is AddonId => valid.has(id as AddonId));
}

export function buildPricingQuery(tierSize: number, addons: AddonId[]): string {
  const params = new URLSearchParams();
  params.set("tier", String(tierSize));
  if (addons.length > 0) params.set("addons", addons.join(","));
  return params.toString();
}

export function formatChallengeTimeLimit(selected: AddonId[] = []): string {
  const days = selected.includes("doubletime")
    ? CHALLENGE_WINDOW_DAYS * 2
    : CHALLENGE_WINDOW_DAYS;
  return `${days} calendar days`;
}

export function challengeWindowDays(selected: AddonId[]): number {
  return selected.includes("doubletime")
    ? CHALLENGE_WINDOW_DAYS * 2
    : CHALLENGE_WINDOW_DAYS;
}

export function payoutCycleDays(selected: AddonId[]): number {
  return selected.includes("fastpayout")
    ? FAST_PAYOUT_CYCLE_DAYS
    : PAYOUT_CYCLE_DAYS;
}
