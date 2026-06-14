/**
 * Challenge pricing — single source of truth for tiers, add-ons, and totals.
 * Every number shown on /pricing and /dashboard/challenge/select comes from here.
 */

export type PricingTier = {
  size: number;
  fee: number;
  resetFee: number;
  /** Profit target as a decimal (e.g. 0.18 = 18%). */
  profitTarget: number;
  maxDrawdown: number;
  dailyLossLimit: number;
  minTradingDays: number;
  maxPositionSize: number;
  popular: boolean;
};

export type AddonId =
  | "90split"
  | "95split"
  | "drawdown"
  | "doubletime"
  | "fastpayout";

export type Addon = {
  id: AddonId;
  name: string;
  description: string;
  priceType: "percent" | "flat";
  priceValue: number;
  /** When true, cannot be selected alongside other exclusive add-ons in the same group. */
  exclusive: boolean;
  badge: string | null;
};

export const CHALLENGE_WINDOW_DAYS = 30;
export const PAYOUT_CYCLE_DAYS = 14;
export const FAST_PAYOUT_CYCLE_DAYS = 7;

export const DEFAULT_TIER_SIZE = 25_000;

export const TIERS: PricingTier[] = [
  {
    size: 5_000,
    fee: 55,
    resetFee: 41,
    profitTarget: 0.25,
    maxDrawdown: 0.08,
    dailyLossLimit: 0.04,
    minTradingDays: 7,
    maxPositionSize: 0.15,
    popular: false,
  },
  {
    size: 10_000,
    fee: 109,
    resetFee: 81,
    profitTarget: 0.22,
    maxDrawdown: 0.08,
    dailyLossLimit: 0.04,
    minTradingDays: 8,
    maxPositionSize: 0.12,
    popular: false,
  },
  {
    size: 15_000,
    fee: 149,
    resetFee: 111,
    profitTarget: 0.2,
    maxDrawdown: 0.08,
    dailyLossLimit: 0.04,
    minTradingDays: 8,
    maxPositionSize: 0.12,
    popular: false,
  },
  {
    size: 20_000,
    fee: 189,
    resetFee: 141,
    profitTarget: 0.2,
    maxDrawdown: 0.07,
    dailyLossLimit: 0.04,
    minTradingDays: 9,
    maxPositionSize: 0.12,
    popular: false,
  },
  {
    size: 25_000,
    fee: 239,
    resetFee: 179,
    profitTarget: 0.18,
    maxDrawdown: 0.07,
    dailyLossLimit: 0.04,
    minTradingDays: 10,
    maxPositionSize: 0.1,
    popular: true,
  },
  {
    size: 35_000,
    fee: 319,
    resetFee: 239,
    profitTarget: 0.16,
    maxDrawdown: 0.07,
    dailyLossLimit: 0.03,
    minTradingDays: 11,
    maxPositionSize: 0.1,
    popular: false,
  },
  {
    size: 50_000,
    fee: 499,
    resetFee: 374,
    profitTarget: 0.15,
    maxDrawdown: 0.07,
    dailyLossLimit: 0.03,
    minTradingDays: 12,
    maxPositionSize: 0.08,
    popular: false,
  },
  {
    size: 75_000,
    fee: 699,
    resetFee: 524,
    profitTarget: 0.13,
    maxDrawdown: 0.06,
    dailyLossLimit: 0.03,
    minTradingDays: 14,
    maxPositionSize: 0.06,
    popular: false,
  },
  {
    size: 100_000,
    fee: 979,
    resetFee: 734,
    profitTarget: 0.11,
    maxDrawdown: 0.06,
    dailyLossLimit: 0.02,
    minTradingDays: 15,
    maxPositionSize: 0.05,
    popular: false,
  },
];

export const ADDONS: Addon[] = [
  {
    id: "90split",
    name: "90% profit split",
    description:
      "Changes the default 70/30 split to 90/10 permanently. Keep 90 cents of every dollar you earn.",
    priceType: "percent",
    priceValue: 0.5,
    exclusive: true,
    badge: null,
  },
  {
    id: "95split",
    name: "95% profit split",
    description:
      "The highest profit split available anywhere in the prediction market prop firm industry. Keep 95 cents of every dollar.",
    priceType: "percent",
    priceValue: 0.8,
    exclusive: true,
    badge: "★",
  },
  {
    id: "drawdown",
    name: "Drawdown boost",
    description:
      "Raises your maximum drawdown ceiling to 15% and your daily loss limit to 8% on both the demo and funded account.",
    priceType: "percent",
    priceValue: 0.65,
    exclusive: false,
    badge: null,
  },
  {
    id: "doubletime",
    name: "Double time",
    description:
      "Doubles your challenge window from 30 to 60 days. More time to hit the profit target — no other rule changes.",
    priceType: "percent",
    priceValue: 0.09,
    exclusive: false,
    badge: null,
  },
  {
    id: "fastpayout",
    name: "Fast payout 7-day",
    description:
      "Reduces funded-account payout cycles from 14 days to 7 days. Get paid faster, every cycle, forever.",
    priceType: "flat",
    priceValue: 39,
    exclusive: false,
    badge: "★",
  },
];

/** Profit-split add-ons are mutually exclusive. */
export const SPLIT_ADDON_IDS: AddonId[] = ["90split", "95split"];

export function getTierBySize(size: number): PricingTier | undefined {
  return TIERS.find((t) => t.size === size);
}

export function getDefaultTier(): PricingTier {
  return getTierBySize(DEFAULT_TIER_SIZE) ?? TIERS[4];
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
    split95: "95split",
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

/** Challenge window days for display (doubles with doubletime add-on). */
export function challengeWindowDays(selected: AddonId[]): number {
  return selected.includes("doubletime")
    ? CHALLENGE_WINDOW_DAYS * 2
    : CHALLENGE_WINDOW_DAYS;
}

/** Payout cycle days for display (7 with fastpayout add-on). */
export function payoutCycleDays(selected: AddonId[]): number {
  return selected.includes("fastpayout")
    ? FAST_PAYOUT_CYCLE_DAYS
    : PAYOUT_CYCLE_DAYS;
}
