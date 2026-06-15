export type Tier = {
  size: number;
  baseFee: number;
  resetFee: number;
  /** Uniform 20% profit target across all tiers. */
  profitTargetPct: number;
  maxDrawdownPct: number;
  maxPositionPct: number;
  maxExposurePct: number;
  windowDays: number;
  /** Evaluation consistency: max share of profit target from one market ticker. */
  consistencyCapPct: number;
  /** Recommended starting tier ($25K). */
  featured?: boolean;
  /** Unique to Lenium ($75K). */
  exclusive?: boolean;
};

/** Six evaluation tiers — the only account sizes available. */
export const TIERS: Tier[] = [
  { size: 5000, baseFee: 65, resetFee: 49, profitTargetPct: 20, maxDrawdownPct: 10, maxPositionPct: 5, maxExposurePct: 10, windowDays: 30, consistencyCapPct: 15 },
  { size: 10000, baseFee: 119, resetFee: 89, profitTargetPct: 20, maxDrawdownPct: 10, maxPositionPct: 5, maxExposurePct: 10, windowDays: 30, consistencyCapPct: 15 },
  { size: 25000, baseFee: 249, resetFee: 187, profitTargetPct: 20, maxDrawdownPct: 10, maxPositionPct: 5, maxExposurePct: 10, windowDays: 30, consistencyCapPct: 15, featured: true },
  { size: 50000, baseFee: 529, resetFee: 397, profitTargetPct: 20, maxDrawdownPct: 10, maxPositionPct: 5, maxExposurePct: 10, windowDays: 30, consistencyCapPct: 15 },
  { size: 75000, baseFee: 729, resetFee: 547, profitTargetPct: 20, maxDrawdownPct: 10, maxPositionPct: 5, maxExposurePct: 10, windowDays: 30, consistencyCapPct: 15, exclusive: true },
  { size: 100000, baseFee: 999, resetFee: 749, profitTargetPct: 20, maxDrawdownPct: 10, maxPositionPct: 5, maxExposurePct: 10, windowDays: 30, consistencyCapPct: 15 },
];

export const PROFIT_TARGET_PCT = 20;
export const MAX_DRAWDOWN_PCT = 10;
export const MAX_POSITION_PCT = 5;
export const MAX_EXPOSURE_PCT = 10;
export const OPENING_PRICE_MIN_CENTS = 15;
export const OPENING_PRICE_MAX_CENTS = 85;
export const MARKET_RESOLUTION_WINDOW_DAYS = 60;
export const CHALLENGE_WINDOW_DAYS = 30;
export const FUNDED_COMMISSION_PCT = 1;
export const MIN_PAYOUT_PCT = 2;
export const INACTIVITY_WARNING_DAYS = 20;
export const INACTIVITY_TERMINATE_DAYS = 30;

export const resetSavings = (tier: Tier) => tier.baseFee - tier.resetFee;

export const resetLineLong = (tier: Tier) =>
  `Restart this challenge — ${usd(tier.resetFee)} (save ${usd(resetSavings(tier))} vs buying fresh)`;

export const resetLineShort = (tier: Tier) =>
  `Reset a failed attempt: ${usd(tier.resetFee)}`;

export const resetCheckoutTitle = (tier: Tier) =>
  `${usd(tier.size)} Challenge — Reset Purchase`;

/** Default profit split (trader %) included with every base fee. */
export const DEFAULT_TRADER_SPLIT_PCT = 70;
/** Funded consistency: max share of monthly profit from one market ticker. */
export const FUNDED_CONSISTENCY_CAP_PCT = 20;
/** Standard funded-account payout cycle (business days). */
export const PAYOUT_CYCLE_DAYS = 7;
/** Fast payout add-on cycle (business days). */
export const FAST_PAYOUT_CYCLE_DAYS = 3;

export const demoTargetUsd = (tier: Tier) =>
  Math.round((tier.size * tier.profitTargetPct) / 100);

export const staticDrawdownFloorUsd = (tier: Tier) =>
  Math.round(tier.size * (1 - tier.maxDrawdownPct / 100));

export const maxPositionUsd = (tier: Tier, balance = tier.size) =>
  Math.round((balance * tier.maxPositionPct) / 100);

export const maxExposureUsd = (tier: Tier, balance = tier.size) =>
  Math.round((balance * tier.maxExposurePct) / 100);

export const minPayoutUsd = (tier: Tier) =>
  Math.round((tier.size * MIN_PAYOUT_PCT) / 100);

export type AddonId =
  | "split90"
  | "drawdown"
  | "consistency"
  | "doubletime"
  | "fastpayout";

export type Addon = {
  id: AddonId;
  name: string;
  blurb: string;
  pctOfBase?: number;
  flat?: number;
};

export const ADDONS: Addon[] = [
  {
    id: "split90",
    name: "90% profit split",
    blurb:
      "Raises the funded profit split from 70/30 to 90/10 permanently — the maximum split available from any CFTC-regulated prediction market prop firm.",
    pctOfBase: 0.5,
  },
  {
    id: "drawdown",
    name: "Drawdown boost",
    blurb:
      "Raises max drawdown to 15%, max total exposure to 15%, and max single position to 7.5% on both evaluation and funded accounts.",
    pctOfBase: 0.65,
  },
  {
    id: "consistency",
    name: "Consistency boost",
    blurb:
      "Raises the consistency threshold from 15% to 25% during evaluation and from 20% to 30% on the funded account.",
    pctOfBase: 0.2,
  },
  {
    id: "doubletime",
    name: "Double time",
    blurb:
      "Extends the evaluation window from 30 to 60 calendar days. No other rules change.",
    pctOfBase: 0.09,
  },
  {
    id: "fastpayout",
    name: "3-day fast payout",
    blurb:
      "Reduces payout processing from 7 business days to 3 business days on every funded payout permanently.",
    flat: 39,
  },
];

export function addonPrice(addon: Addon, baseFee: number): number {
  if (addon.flat != null) return addon.flat;
  if (addon.pctOfBase != null) return Math.round(addon.pctOfBase * baseFee * 100) / 100;
  return 0;
}

/** Formatted add-on price with cents when applicable. */
export function addonPriceLabel(addon: Addon, baseFee: number): string {
  const price = addonPrice(addon, baseFee);
  return price % 1 === 0 ? `$${price}` : `$${price.toFixed(2)}`;
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
  const addonLines = ADDONS.filter((a) => selected.includes(a.id)).map((a) => ({
    id: a.id,
    name: a.name,
    price: addonPrice(a, tier.baseFee),
  }));
  const addonSubtotal = addonLines.reduce((s, l) => s + l.price, 0);
  const discountPct = bundleDiscountPct(selected.length);
  const discount = Math.round(addonSubtotal * discountPct);
  const total = tier.baseFee + addonSubtotal - discount;

  return {
    baseFee: tier.baseFee,
    addonLines,
    addonSubtotal,
    discountPct,
    discount,
    total,
  };
}

export type RuleRow = {
  label: string;
  format: (t: Tier) => string;
  plain: string;
};

/** Rows for the six-tier comparison grid on the rules page. */
export const TIER_COMPARISON_ROWS: RuleRow[] = [
  {
    label: "Profit target",
    format: (t) => `20% (${usd(demoTargetUsd(t))})`,
    plain: "Uniform 20% across all six tiers.",
  },
  {
    label: "Max drawdown",
    format: (t) => `10% static (${usd(staticDrawdownFloorUsd(t))} floor)`,
    plain: "Static floor set at activation — never rises with profits.",
  },
  {
    label: "Daily loss limit",
    format: () => "None",
    plain: "Removed entirely from evaluation and funded phases.",
  },
  {
    label: "Minimum trading days",
    format: () => "None",
    plain: "Removed entirely — quality of predictions matters more than frequency.",
  },
  {
    label: "Max position size",
    format: (t) => `5% (${usd(maxPositionUsd(t))})`,
    plain: "No single position may exceed 5% of current balance at entry.",
  },
  {
    label: "Max total exposure",
    format: (t) => `10% (${usd(maxExposureUsd(t))})`,
    plain: "Combined open position value cannot exceed 10% of balance.",
  },
  {
    label: "Opening price range",
    format: () => `${OPENING_PRICE_MIN_CENTS}¢–${OPENING_PRICE_MAX_CENTS}¢ YES`,
    plain: "Wider than PropMarket's 20¢–80¢ range.",
  },
  {
    label: "Market resolution window",
    format: () => `${MARKET_RESOLUTION_WINDOW_DAYS} days`,
    plain: "Positions must be in markets resolving within 60 calendar days.",
  },
  {
    label: "Consistency rule",
    format: () => "15% per market",
    plain: "Target adjusts up if exceeded — account is never terminated.",
  },
  {
    label: "Challenge window",
    format: () => `${CHALLENGE_WINDOW_DAYS} days`,
    plain: "60 days with Double Time add-on. Expired = reset fee.",
  },
  {
    label: "Evaluation fee",
    format: (t) => `$${t.baseFee}`,
    plain: "One-time, non-refundable.",
  },
  {
    label: "Reset fee",
    format: (t) => `$${t.resetFee}`,
    plain: "Discounted restart after breach or expiry.",
  },
];

export const RULES_INTRO =
  "This is the definitive and final rule set for the Lenium prediction market prop firm. Every page of the Lenium website, every section of the terms of service, every funded account agreement, and every piece of marketing copy reflects exactly what is written here. Lenium is the first CFTC-regulated prediction market prop firm, built on Kalshi — the only CFTC-licensed prediction market exchange in the United States.";

export const UNCHANGED_RULES: { title: string; body: string }[] = [
  {
    title: "Position sizing (5% / 10%)",
    body: "The 5% maximum single position and 10% maximum total exposure are the mathematical foundation of Lenium's risk architecture. They align maximum instantaneous loss with the drawdown floor.",
  },
  {
    title: "Opening price range ($0.15–$0.85)",
    body: "Deliberately wider than PropMarket's $0.20–$0.80 range, giving Lenium traders access to a broader set of eligible markets.",
  },
  {
    title: "30-day challenge / 60-day resolution window",
    body: "The 30-day evaluation window and 60-day market resolution window reflect the natural rhythm of Kalshi's market calendar and remain unchanged.",
  },
];

export const RULES_CONCLUSION =
  "The flat 20% profit target, 10% static evaluation drawdown, $0.15–$0.85 price range, absence of daily loss limits and minimum trading days, 7-day standard payout, and 90% profit split add-on make Lenium the most competitive offer in the CFTC-regulated prediction market prop trading category.";

/** Evaluation-phase rules — uniform across all six tiers (dollar amounts scale by size). */
export const RULE_ROWS: RuleRow[] = [
  {
    label: "Profit target",
    format: (t) => `20% (${usd(demoTargetUsd(t))})`,
    plain:
      "A flat 20% gain on your starting balance. Same percentage on every tier.",
  },
  {
    label: "Max drawdown",
    format: (t) =>
      `10% static floor (${usd(staticDrawdownFloorUsd(t))})`,
    plain:
      "Your floor is set on day one and never rises during evaluation — profits do not tighten the limit.",
  },
  {
    label: "Max position size",
    format: (t) => `5% (${usd(maxPositionUsd(t))})`,
    plain:
      "No single position may exceed 5% of your current balance at entry.",
  },
  {
    label: "Max total exposure",
    format: (t) => `10% (${usd(maxExposureUsd(t))})`,
    plain:
      "The combined value of all open positions cannot exceed 10% of balance.",
  },
  {
    label: "Opening price range",
    format: () => `${OPENING_PRICE_MIN_CENTS}¢–${OPENING_PRICE_MAX_CENTS}¢ YES`,
    plain:
      "New positions only in contracts trading between 15¢ and 85¢ YES — wider than PropMarket's 20¢–80¢ range.",
  },
  {
    label: "Market resolution window",
    format: () => `Within ${MARKET_RESOLUTION_WINDOW_DAYS} days`,
    plain:
      "Positions must be in markets resolving within 60 calendar days of entry.",
  },
  {
    label: "Consistency rule",
    format: () => "15% per market (target adjusts up, never terminates)",
    plain:
      "No single market may contribute more than 15% of your profit target. Exceeding it raises the target — it never ends your account.",
  },
  {
    label: "Challenge window",
    format: (t) => `${t.windowDays} calendar days`,
    plain:
      "30 calendar days from activation. Expired evaluations are treated like breaches — purchase a reset at the discounted fee. Double Time extends to 60 days.",
  },
  {
    label: "Daily loss limit",
    format: () => "None",
    plain:
      "Removed entirely. Drawdown and position limits provide sufficient protection for binary Kalshi contracts.",
  },
  {
    label: "Minimum trading days",
    format: () => "None",
    plain:
      "Removed entirely. A trader who makes twelve well-researched positions and passes has demonstrated more edge than one trading purely for frequency.",
  },
];

export const PLATFORM_RULES: RuleRow[] = [];

/** Funded-phase rules displayed on the rules page. */
export const FUNDED_RULE_ROWS: RuleRow[] = [
  {
    label: "Profit target",
    format: () => "None",
    plain: "No monthly, annual, or performance-review minimum on funded accounts.",
  },
  {
    label: "Time limit",
    format: () => "None",
    plain: "Trade indefinitely as long as you stay within risk rules and the inactivity policy.",
  },
  {
    label: "Max drawdown",
    format: () => "10% trailing high-water mark",
    plain:
      "The drawdown floor rises permanently whenever your account reaches a new all-time high. It only moves up — never down.",
  },
  {
    label: "Position & exposure",
    format: (t) =>
      `5% / 10% of current balance (${usd(maxPositionUsd(t))} / ${usd(maxExposureUsd(t))} at start)`,
    plain:
      "Same 5% max single position and 10% max total exposure as evaluation — scaled to your current balance as the account grows.",
  },
  {
    label: "Opening price range",
    format: () => `${OPENING_PRICE_MIN_CENTS}¢–${OPENING_PRICE_MAX_CENTS}¢ YES`,
    plain: "Identical to evaluation — contracts must trade between 15¢ and 85¢ YES at entry.",
  },
  {
    label: "Market resolution window",
    format: () => `Within ${MARKET_RESOLUTION_WINDOW_DAYS} days`,
    plain: "Identical to evaluation — positions must be in markets resolving within 60 calendar days.",
  },
  {
    label: "Consistency rule",
    format: () => `${FUNDED_CONSISTENCY_CAP_PCT}% per market (target adjusts, never terminates)`,
    plain:
      "No single market may contribute more than 20% of monthly realized profit. Exceeding it adjusts the target upward — it never terminates your account.",
  },
  {
    label: "Profit split",
    format: () => `${DEFAULT_TRADER_SPLIT_PCT}/${100 - DEFAULT_TRADER_SPLIT_PCT} default (90/10 with add-on)`,
    plain:
      "Default 70/30 on all realized net profits at payout. Add the 90% profit split add-on for 90/10 permanently.",
  },
  {
    label: "Payout cycle",
    format: () =>
      `${PAYOUT_CYCLE_DAYS} business days (${FAST_PAYOUT_CYCLE_DAYS} with Fast Payout add-on)`,
    plain:
      "Every payout request is processed within 7 business days. The 3-day fast payout add-on reduces this to 3 business days on every request.",
  },
  {
    label: "Minimum payout",
    format: (t) => `2% of starting balance (${usd(minPayoutUsd(t))})`,
    plain: "Payout requests below 2% of your starting account balance are declined.",
  },
  {
    label: "Commission",
    format: () => `${FUNDED_COMMISSION_PCT}% on opening transactions`,
    plain:
      "A 1% commission on the notional value of every opening transaction on funded accounts. No commission during evaluation.",
  },
  {
    label: "Inactivity policy",
    format: () =>
      `Warning at ${INACTIVITY_WARNING_DAYS} days, termination at ${INACTIVITY_TERMINATE_DAYS} days`,
    plain:
      "No trades for 30 consecutive calendar days terminates the account. A warning is sent at 20 days. Any single trade resets the counter.",
  },
];

export const TERMINATION_CONDITIONS: string[] = [
  "Portfolio value reaches or falls below the trailing drawdown floor (funded) or static floor (evaluation).",
  "Attempting to circumvent position size or exposure limits by any means.",
  "30 consecutive calendar days of inactivity after the 20-day warning (funded accounts).",
  "Opening positions in markets scheduled to resolve more than 60 days from the opening date.",
  "Opening positions in contracts trading below 15¢ or above 85¢ YES.",
  "Material violation of the funded account agreement, including coordinated trading across Lenium accounts.",
];

export const BUNDLE_DISCOUNTS = [
  { count: 2, pct: 10 },
  { count: 3, pct: 12 },
  { count: 4, pct: 15 },
  { count: 5, pct: 18 },
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
    a: "You purchase an evaluation account at your chosen tier and trade prediction market contracts on a simulated account that mirrors live Kalshi prices. Hit your 20% profit target within 30 days without breaching the 10% static drawdown floor, while respecting position size, exposure, price range, and consistency rules — and you receive a funded account.",
  },
  {
    q: "What happens when I pass?",
    a: "You sign a trader agreement and receive access to a funded Lenium sub-account on Kalshi with real capital equal to your challenge size. You trade live markets and earn a share of your profits on a 7-business-day payout cycle.",
  },
  {
    q: "What is the profit split?",
    a: "The default split is 70% to you, 30% to Lenium. Add the 90% profit split add-on at purchase to lock in 90/10 permanently — the highest split available from any CFTC-regulated prediction market prop firm.",
  },
  {
    q: "What if I fail the challenge?",
    a: "Your account is closed after a drawdown breach or expiry. You may reset at the discounted reset fee for your tier and begin a new challenge immediately at the same account size.",
  },
  {
    q: "Can I trade any Kalshi market?",
    a: "You can trade any eligible Kalshi market that resolves within 60 days and has a YES price between 15¢ and 85¢. Position size (5%), total exposure (10%), drawdown, and consistency rules also apply.",
  },
  {
    q: "What happens if I am inactive on a funded account?",
    a: "A funded account with no trades opened for 30 consecutive calendar days is terminated. Lenium sends a warning at 20 consecutive days of inactivity, giving you 10 days to place at least one trade before termination.",
  },
  {
    q: "How are payouts processed?",
    a: "Funded account payouts are processed via ACH bank transfer within 7 business days of each request. The minimum payout is 2% of your starting account balance. Add the 3-day fast payout add-on to reduce processing to 3 business days. A 1% commission applies to opening transactions on funded accounts only.",
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
  { rank: 5, username: "calibrated", tier: 50000, profitPct: 39.7, earnings: 9744, streak: 44, funded: true },
  { rank: 6, username: "limit_only", tier: 25000, profitPct: 47.3, earnings: 8278, streak: 22, funded: true },
  { rank: 7, username: "tail_hedge", tier: 50000, profitPct: 18.9, earnings: 6615, streak: 12, funded: true },
  { rank: 8, username: "kelly_fraction", tier: 10000, profitPct: 35.2, earnings: 4928, streak: 16, funded: false },
  { rank: 9, username: "no_taker_fees", tier: 75000, profitPct: 41.0, earnings: 4305, streak: 25, funded: true },
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

export const compactTier = (size: number) => `$${size / 1000}K`;

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
