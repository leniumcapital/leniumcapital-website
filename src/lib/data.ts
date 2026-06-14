import {
  TIERS as PRICING_TIERS,
  ADDONS as PRICING_ADDONS,
  getTierBySize,
  computePrice as computePricingPrice,
  addonPrice as pricingAddonPrice,
  SPLIT_ADDON_IDS,
  PAYOUT_CYCLE_DAYS,
  type AddonId,
} from "./pricing";

export type { AddonId };

export type Tier = {
  size: number;
  baseFee: number;
  /** One-time profit (%) required to pass the demo challenge. */
  profitTargetPct: number;
  /** Minimum monthly profit (%) to unlock a payout on the funded account. */
  fundedTargetPct: number;
  maxDrawdownPct: number;
  dailyLimitPct: number;
  maxPositionPct: number;
  minTradingDays: number;
  windowDays: number;
  /** Demo consistency cap: max share of total profit from a single day. */
  consistencyCapPct: number;
  /** Tier offered only by Lenium ($15k, $20k, $35k, $75k). */
  exclusive: boolean;
};

/**
 * Nine evaluation tiers. Values are derived from `pricing.ts` so the pricing
 * page and dashboard always stay in sync.
 */
type LegacyTierMeta = {
  fundedTargetPct: number;
  windowDays: number;
  consistencyCapPct: number;
  exclusive: boolean;
};

const LEGACY_TIER_META: Record<number, LegacyTierMeta> = {
  5000: { fundedTargetPct: 5, windowDays: 30, consistencyCapPct: 40, exclusive: false },
  10000: { fundedTargetPct: 5, windowDays: 30, consistencyCapPct: 40, exclusive: false },
  15000: { fundedTargetPct: 5, windowDays: 30, consistencyCapPct: 35, exclusive: true },
  20000: { fundedTargetPct: 4.5, windowDays: 35, consistencyCapPct: 35, exclusive: true },
  25000: { fundedTargetPct: 4.5, windowDays: 35, consistencyCapPct: 30, exclusive: false },
  35000: { fundedTargetPct: 4, windowDays: 35, consistencyCapPct: 30, exclusive: true },
  50000: { fundedTargetPct: 4, windowDays: 40, consistencyCapPct: 25, exclusive: false },
  75000: { fundedTargetPct: 3.5, windowDays: 40, consistencyCapPct: 25, exclusive: true },
  100000: { fundedTargetPct: 3.5, windowDays: 45, consistencyCapPct: 20, exclusive: false },
};

export const TIERS: Tier[] = PRICING_TIERS.map((t) => {
  const meta = LEGACY_TIER_META[t.size];
  return {
    size: t.size,
    baseFee: t.fee,
    profitTargetPct: t.profitTarget * 100,
    fundedTargetPct: meta.fundedTargetPct,
    maxDrawdownPct: t.maxDrawdown * 100,
    dailyLimitPct: t.dailyLossLimit * 100,
    maxPositionPct: t.maxPositionSize * 100,
    minTradingDays: t.minTradingDays,
    windowDays: meta.windowDays,
    consistencyCapPct: meta.consistencyCapPct,
    exclusive: meta.exclusive,
  };
});

/** Reset fee from the canonical pricing schedule. */
export const resetFee = (tier: Tier) =>
  getTierBySize(tier.size)?.resetFee ?? Math.floor(tier.baseFee * 0.75);
/** What a trader saves by resetting instead of buying a fresh challenge. */
export const resetSavings = (tier: Tier) => tier.baseFee - resetFee(tier);
/**
 * The $35,000 reset fee ($239) equals the $25,000 base fee, so the reset label
 * must always name the account size on that tier to avoid cross-tier confusion.
 */
export const resetNeedsSize = (tier: Tier) => tier.size === 35000;

/** Rules-table phrasing: "Restart this challenge — $X (save $Y vs buying fresh)". */
export const resetLineLong = (tier: Tier) =>
  `${
    resetNeedsSize(tier)
      ? `Restart your ${usd(tier.size)} challenge`
      : "Restart this challenge"
  } — ${usd(resetFee(tier))} (save ${usd(resetSavings(tier))} vs buying fresh)`;

/** Pricing-line phrasing: "Reset a failed attempt: $X (25% off)". */
export const resetLineShort = (tier: Tier) =>
  resetNeedsSize(tier)
    ? `Reset your ${usd(tier.size)} attempt: ${usd(resetFee(tier))} (25% off)`
    : `Reset a failed attempt: ${usd(resetFee(tier))} (25% off)`;

/** Checkout order-summary title: "$X Challenge — Reset Purchase". */
export const resetCheckoutTitle = (tier: Tier) =>
  `${usd(tier.size)} Challenge — Reset Purchase`;

/** Default profit split (trader %) included with every base fee. */
export const DEFAULT_TRADER_SPLIT_PCT = 70;
/** Funded-account consistency cap: no single day may exceed this share of monthly profit. */
export const FUNDED_CONSISTENCY_CAP_PCT = 50;
/** Standard funded-account payout cycle, in days. */
export { PAYOUT_CYCLE_DAYS };

/** One-time profit ($) required to pass the demo challenge. */
export const demoTargetUsd = (tier: Tier) =>
  Math.round((tier.size * tier.profitTargetPct) / 100);
/** Minimum monthly profit ($) to unlock a funded payout. */
export const fundedTargetUsd = (tier: Tier) =>
  Math.round((tier.size * tier.fundedTargetPct) / 100);

export type Addon = {
  id: AddonId;
  name: string;
  blurb: string;
  /** Percentage of base fee (e.g. 0.5 = 50%). Mutually exclusive with `flat`. */
  pctOfBase?: number;
  /** Flat dollar fee. */
  flat?: number;
  exclusive: boolean;
};

export const ADDONS: Addon[] = PRICING_ADDONS.map((a) => ({
  id: a.id,
  name: a.name,
  blurb: a.description,
  pctOfBase: a.priceType === "percent" ? a.priceValue : undefined,
  flat: a.priceType === "flat" ? a.priceValue : undefined,
  exclusive: a.exclusive,
}));

/** The two profit-split upgrades cannot both apply to one account. */
export const SPLIT_ADDONS: AddonId[] = SPLIT_ADDON_IDS;

export function addonPrice(addon: Addon, baseFee: number): number {
  const source = PRICING_ADDONS.find((a) => a.id === addon.id);
  return source ? pricingAddonPrice(source, baseFee) : 0;
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

/** Compute a full price breakdown for a tier + selected add-ons. */
export function computePrice(tier: Tier, selected: AddonId[]): PriceBreakdown {
  const pricingTier = getTierBySize(tier.size);
  if (!pricingTier) {
    return {
      baseFee: tier.baseFee,
      addonLines: [],
      addonSubtotal: 0,
      discountPct: 0,
      discount: 0,
      total: tier.baseFee,
    };
  }
  return computePricingPrice(pricingTier, selected);
}

export type RuleRow = {
  key: keyof Tier;
  label: string;
  format: (t: Tier) => string;
  plain: string;
};

export const RULE_ROWS: RuleRow[] = [
  {
    key: "profitTargetPct",
    label: "Profit target",
    format: (t) => `${t.profitTargetPct}% ($${demoTargetUsd(t).toLocaleString()})`,
    plain: "The one-time gain you need to pass. Scaled to your account size.",
  },
  {
    key: "maxDrawdownPct",
    label: "Max drawdown",
    format: (t) => `${t.maxDrawdownPct}%`,
    plain:
      "The most your account can fall from its peak before the challenge ends.",
  },
  {
    key: "dailyLimitPct",
    label: "Daily loss limit",
    format: (t) => `${t.dailyLimitPct}%`,
    plain:
      "The most you can lose in a single day. Prevents one bad event from ending your challenge.",
  },
  {
    key: "minTradingDays",
    label: "Minimum trading days",
    format: (t) => `${t.minTradingDays} days`,
    plain:
      "The minimum number of distinct days you must trade. Proves a repeatable process, not a single lucky session.",
  },
  {
    key: "maxPositionPct",
    label: "Max position size",
    format: (t) => `${t.maxPositionPct}%`,
    plain:
      "The largest share of your account any single contract can represent. Keeps one binary outcome from deciding everything.",
  },
];

export type EarlyWithdrawalTier = {
  range: string;
  feePct: number;
};

export const EARLY_WITHDRAWAL: EarlyWithdrawalTier[] = [
  { range: "1–3 days early", feePct: 25 },
  { range: "4–7 days early", feePct: 20 },
  { range: "8–11 days early", feePct: 15 },
  { range: "12–13 days early", feePct: 10 },
];

export type FAQ = { q: string; a: string };

export const FAQS: FAQ[] = [
  {
    q: "What is Lenium?",
    a: "Lenium is a prediction market proprietary trading firm. We fund skilled traders to trade event contracts on Kalshi using our capital. Traders prove their skill through a paid evaluation challenge and receive a funded account when they pass.",
  },
  {
    q: "Is Lenium regulated?",
    a: "Lenium operates as an evaluation services company. The underlying trading infrastructure is provided by Kalshi, a CFTC-licensed Designated Contract Market — the highest level of US regulatory approval for a prediction market platform. Lenium itself is not a broker-dealer or investment adviser and does not require those registrations.",
  },
  {
    q: "Is this available in all 50 states?",
    a: "Yes. Lenium is built exclusively on Kalshi, which is available in all 50 US states and requires no cryptocurrency wallet or blockchain interaction.",
  },
  {
    q: "How does the challenge work?",
    a: "You purchase an evaluation account at your chosen tier and trade prediction market contracts on a simulated account that mirrors live Kalshi prices. Hit your profit target without breaching the max drawdown or daily loss limit, keep within the max position size, and meet the minimum trading days — and you receive a funded account.",
  },
  {
    q: "What happens when I pass?",
    a: "You sign a trader agreement and receive access to a funded Lenium sub-account on Kalshi with real capital equal to your challenge size. You trade live markets and earn a share of your profits on a 14-day payout cycle.",
  },
  {
    q: "What is the profit split?",
    a: "The default split is 70% to you, 30% to Lenium. Add the 90% split add-on to lock in 90/10 permanently, or the 95% split add-on for the highest split in the prediction market prop firm industry.",
  },
  {
    q: "What if I fail the challenge?",
    a: "Your account is closed. You may reset at 25% off the original challenge fee and begin a new challenge immediately at the same account size.",
  },
  {
    q: "Can I trade any Kalshi market?",
    a: "Yes. You can trade any market available on Kalshi. The only constraints are the five challenge rules — your profit target, max drawdown, daily loss limit, minimum trading days, and max position size.",
  },
  {
    q: "How are payouts processed?",
    a: "Funded account payouts are processed via ACH bank transfer on a 14-day cycle. Add the Fast Payout add-on to move to a 7-day cycle. Early withdrawal of profits before the payout date is available for a liquidity service fee of 10% to 25% depending on how early the request is made.",
  },
];

export type LeaderboardEntry = {
  rank: number;
  username: string;
  tier: number;
  profitPct: number;
  earnings: number;
  streak: number;
  funded: boolean;
};

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, username: "vega_runner", tier: 100000, profitPct: 41.8, earnings: 29260, streak: 38, funded: true },
  { rank: 2, username: "probability_pat", tier: 75000, profitPct: 38.2, earnings: 20055, streak: 31, funded: true },
  { rank: 3, username: "maker_mode", tier: 50000, profitPct: 44.1, earnings: 15435, streak: 27, funded: true },
  { rank: 4, username: "edge_or_exit", tier: 100000, profitPct: 22.6, earnings: 15820, streak: 19, funded: true },
  { rank: 5, username: "calibrated", tier: 35000, profitPct: 39.7, earnings: 9744, streak: 44, funded: true },
  { rank: 6, username: "limit_only", tier: 25000, profitPct: 47.3, earnings: 8278, streak: 22, funded: true },
  { rank: 7, username: "tail_hedge", tier: 50000, profitPct: 18.9, earnings: 6615, streak: 12, funded: true },
  { rank: 8, username: "kelly_fraction", tier: 20000, profitPct: 35.2, earnings: 4928, streak: 16, funded: false },
  { rank: 9, username: "no_taker_fees", tier: 15000, profitPct: 41.0, earnings: 4305, streak: 25, funded: true },
  { rank: 10, username: "settle_at_one", tier: 10000, profitPct: 52.4, earnings: 4192, streak: 14, funded: true },
  { rank: 11, username: "fade_the_hype", tier: 25000, profitPct: 14.8, earnings: 2590, streak: 9, funded: false },
  { rank: 12, username: "resolved_yes", tier: 5000, profitPct: 61.2, earnings: 3060, streak: 18, funded: true },
];

export const STATS = {
  kalshiVolume2025: "$23.8B",
  kalshiMau: "5.1M",
  activeTraders: "1.2M",
  payoutsIndustry: "$1B+",
};

export const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/** Compact dollar formatting for ticker volumes, e.g. 1_280_000 -> "$1.28M". */
export const compactUsd = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
};

export type KalshiMarket = {
  id: string;
  category: string;
  emoji: string;
  color: string;
  title: string;
  closes: string;
  /** Yes price in cents (0–100), also the implied probability. */
  yes: number;
  vol: number;
  markets: number;
};

/** Shape consumed by the floating ticker UI (from live Kalshi or fallback). */
export type TickerMarket = {
  id: string;
  category: string;
  title: string;
  closes: string;
  yes: number;
  vol: number;
  markets: number;
  /** Live Kalshi event/market icon URL (absent for fallback data). */
  image?: string;
  /** Optional Kalshi color code for the icon backdrop. */
  color?: string;
};

/** Visual treatment for a Kalshi category label (emoji + accent color). */
export function categoryMeta(category: string): { emoji: string; color: string } {
  const c = (category || "").toLowerCase();
  if (c.includes("crypto")) return { emoji: "₿", color: "#f59e0b" };
  if (c.includes("econ") || c.includes("financ") || c.includes("inflation"))
    return { emoji: "📈", color: "#2563eb" };
  if (c.includes("politic") || c.includes("elect") || c.includes("world") || c.includes("gov"))
    return { emoji: "🏛️", color: "#dc2626" };
  if (c.includes("climate") || c.includes("weather"))
    return { emoji: "🌡️", color: "#0d9488" };
  if (c.includes("sport") || c.includes("baseball") || c.includes("football") || c.includes("basketball"))
    return { emoji: "⚾", color: "#16a34a" };
  if (c.includes("tech") || c.includes("science") || c.includes("ai"))
    return { emoji: "🤖", color: "#0891b2" };
  if (c.includes("entertain") || c.includes("culture") || c.includes("media") || c.includes("music"))
    return { emoji: "🎬", color: "#db2777" };
  if (c.includes("compan")) return { emoji: "🏢", color: "#7c3aed" };
  if (c.includes("health")) return { emoji: "🩺", color: "#e11d48" };
  return { emoji: "📊", color: "#64748b" };
}

/** Mock Kalshi-style markets used by the floating hero tickers. */
export const KALSHI_MARKETS: KalshiMarket[] = [
  { id: "fed-june", category: "Economics", emoji: "📈", color: "#2563eb", title: "Fed cuts rates at June meeting?", closes: "Jun 18", yes: 71, vol: 1_284_000, markets: 4 },
  { id: "cpi-may", category: "Economics", emoji: "💵", color: "#2563eb", title: "CPI inflation below 3.1% in May?", closes: "Jun 12", yes: 44, vol: 642_000, markets: 3 },
  { id: "shutdown", category: "Politics", emoji: "🏛️", color: "#dc2626", title: "Government shutdown before August?", closes: "Aug 1", yes: 18, vol: 905_000, markets: 2 },
  { id: "btc-150", category: "Crypto", emoji: "₿", color: "#f59e0b", title: "Bitcoin above $150K in 2026?", closes: "Dec 31", yes: 33, vol: 3_120_000, markets: 5 },
  { id: "eth-5k", category: "Crypto", emoji: "Ξ", color: "#8b5cf6", title: "Ethereum above $5,000 this year?", closes: "Dec 31", yes: 41, vol: 1_870_000, markets: 4 },
  { id: "hottest", category: "Climate", emoji: "🌡️", color: "#0d9488", title: "2026 the hottest year on record?", closes: "Dec 31", yes: 61, vol: 410_000, markets: 2 },
  { id: "yankees", category: "Sports", emoji: "⚾", color: "#16a34a", title: "Yankees make the playoffs?", closes: "Sep 30", yes: 78, vol: 538_000, markets: 6 },
  { id: "lakers", category: "Sports", emoji: "🏀", color: "#16a34a", title: "Lakers win their next game?", closes: "Jun 12", yes: 62, vol: 274_000, markets: 3 },
  { id: "boxoffice", category: "Culture", emoji: "🎬", color: "#db2777", title: "Top film opens above $100M?", closes: "Jul 4", yes: 29, vol: 96_000, markets: 2 },
  { id: "approval", category: "Politics", emoji: "🗳️", color: "#dc2626", title: "Approval rating above 45% in June?", closes: "Jun 30", yes: 39, vol: 712_000, markets: 3 },
  { id: "storm", category: "Climate", emoji: "🌀", color: "#0d9488", title: "Named storm before July 15?", closes: "Jul 15", yes: 55, vol: 188_000, markets: 2 },
  { id: "recession", category: "Economics", emoji: "📉", color: "#2563eb", title: "US recession declared in 2026?", closes: "Dec 31", yes: 27, vol: 1_450_000, markets: 4 },
  { id: "sol-300", category: "Crypto", emoji: "🪙", color: "#f59e0b", title: "Solana above $300 this year?", closes: "Dec 31", yes: 48, vol: 660_000, markets: 3 },
  { id: "chiefs", category: "Sports", emoji: "🏈", color: "#16a34a", title: "Chiefs favored in week 1?", closes: "Sep 7", yes: 67, vol: 322_000, markets: 4 },
  { id: "ai-model", category: "Tech", emoji: "🤖", color: "#0891b2", title: "New frontier AI model in June?", closes: "Jun 30", yes: 73, vol: 254_000, markets: 2 },
  { id: "trade-deal", category: "Politics", emoji: "🌐", color: "#dc2626", title: "Major trade deal signed in Q3?", closes: "Sep 30", yes: 36, vol: 401_000, markets: 2 },
];

/** Fallback tickers used before/if live Kalshi data is unavailable. */
export const FALLBACK_TICKERS: TickerMarket[] = KALSHI_MARKETS.map((m) => ({
  id: m.id,
  category: m.category,
  title: m.title,
  closes: m.closes,
  yes: m.yes,
  vol: m.vol,
  markets: m.markets,
}));
