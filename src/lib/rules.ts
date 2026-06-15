/**
 * Lenium rules engine — resolves tier + add-on + phase into enforceable limits
 * and validates orders against the complete framework.
 */
import type { AddonId, Tier } from "@/lib/data";
import {
  TIERS,
  OPENING_PRICE_MIN_CENTS,
  OPENING_PRICE_MAX_CENTS,
  MARKET_RESOLUTION_WINDOW_DAYS,
  DEFAULT_TRADER_SPLIT_PCT,
  PAYOUT_CYCLE_DAYS,
  FAST_PAYOUT_CYCLE_DAYS,
  FUNDED_COMMISSION_PCT,
  MIN_PAYOUT_PCT,
  INACTIVITY_WARNING_DAYS,
  INACTIVITY_TERMINATE_DAYS,
} from "@/lib/data";

export type AccountPhase = "evaluation" | "funded";
export type DrawdownMode = "static" | "trailing";

export { INACTIVITY_WARNING_DAYS, INACTIVITY_TERMINATE_DAYS };

export type ResolvedRules = {
  phase: AccountPhase;
  tierSize: number;
  currentBalance: number;
  profitTargetPct: number;
  profitTargetUsd: number;
  maxDrawdownPct: number;
  maxPositionPct: number;
  maxExposurePct: number;
  maxPositionUsd: number;
  maxExposureUsd: number;
  consistencyCapPct: number;
  windowDays: number;
  openingPriceMinCents: number;
  openingPriceMaxCents: number;
  marketResolutionWindowDays: number;
  traderSplitPct: number;
  payoutCycleDays: number;
  minPayoutUsd: number;
  commissionPct: number;
  drawdownMode: DrawdownMode;
  addons: AddonId[];
};

export type OpenPositionSnapshot = {
  marketTicker: string;
  size: number;
  entryPrice: number;
  direction: "yes" | "no";
  currentPrice: number;
};

export type OrderValidationInput = {
  rules: ResolvedRules;
  startingBalance: number;
  currentProfit: number;
  highWaterMarkUsd: number;
  staticFloorUsd: number;
  openPositions: OpenPositionSnapshot[];
  newOrder: {
    size: number;
    direction: "yes" | "no";
    marketTicker: string;
    entryPrice: number;
    marketExpiry?: string;
  };
  challengeStatus: string;
  accountType: string;
  windowEndDate?: string;
};

export type OrderValidationResult =
  | { ok: true; commission: number }
  | { ok: false; error: string };

/** Resolve all trading limits for a tier, purchased add-ons, and account phase. */
export function resolveRules(params: {
  tier: Tier;
  addons?: AddonId[];
  phase: AccountPhase;
  currentBalance?: number;
}): ResolvedRules {
  const { tier, phase } = params;
  const addons = params.addons ?? [];
  const balance = params.currentBalance ?? tier.size;

  const hasDrawdownBoost = addons.includes("drawdown");
  const hasConsistencyBoost = addons.includes("consistency");
  const hasSplit90 = addons.includes("split90");
  const hasDoubleTime = addons.includes("doubletime");
  const hasFastPayout = addons.includes("fastpayout");

  const maxDrawdownPct = hasDrawdownBoost ? 15 : tier.maxDrawdownPct;
  const maxPositionPct = hasDrawdownBoost ? 7.5 : tier.maxPositionPct;
  const maxExposurePct = hasDrawdownBoost ? 15 : tier.maxExposurePct;

  const evalConsistency = hasConsistencyBoost ? 25 : tier.consistencyCapPct;
  const fundedConsistency = hasConsistencyBoost ? 30 : 20;

  const windowDays =
    phase === "evaluation" && hasDoubleTime ? 60 : tier.windowDays;

  return {
    phase,
    tierSize: tier.size,
    currentBalance: balance,
    profitTargetPct: tier.profitTargetPct,
    profitTargetUsd: Math.round((tier.size * tier.profitTargetPct) / 100),
    maxDrawdownPct,
    maxPositionPct,
    maxExposurePct,
    maxPositionUsd: Math.round((balance * maxPositionPct) / 100),
    maxExposureUsd: Math.round((balance * maxExposurePct) / 100),
    consistencyCapPct:
      phase === "evaluation" ? evalConsistency : fundedConsistency,
    windowDays,
    openingPriceMinCents: OPENING_PRICE_MIN_CENTS,
    openingPriceMaxCents: OPENING_PRICE_MAX_CENTS,
    marketResolutionWindowDays: MARKET_RESOLUTION_WINDOW_DAYS,
    traderSplitPct: hasSplit90 ? 90 : DEFAULT_TRADER_SPLIT_PCT,
    payoutCycleDays: hasFastPayout ? FAST_PAYOUT_CYCLE_DAYS : PAYOUT_CYCLE_DAYS,
    minPayoutUsd: Math.round((tier.size * MIN_PAYOUT_PCT) / 100),
    commissionPct: phase === "funded" ? FUNDED_COMMISSION_PCT : 0,
    drawdownMode: phase === "evaluation" ? "static" : "trailing",
    addons,
  };
}

export function findTier(size: number): Tier | undefined {
  return TIERS.find((t) => t.size === size);
}

/** Portfolio equity = starting balance + realized + unrealized P&L. */
export function equityUsd(startingBalance: number, currentProfit: number): number {
  return startingBalance + currentProfit;
}

/** Drawdown floor in dollars for static (evaluation) or trailing (funded) mode. */
export function drawdownFloorUsd(params: {
  rules: ResolvedRules;
  startingBalance: number;
  highWaterMarkUsd: number;
  staticFloorUsd?: number;
}): number {
  const { rules, startingBalance, highWaterMarkUsd, staticFloorUsd } = params;
  if (rules.drawdownMode === "static") {
    if (staticFloorUsd && staticFloorUsd > 0) return staticFloorUsd;
    return Math.round(startingBalance * (1 - rules.maxDrawdownPct / 100));
  }
  const hwm = Math.max(highWaterMarkUsd, startingBalance);
  return Math.round(hwm * (1 - rules.maxDrawdownPct / 100));
}

/** Current market value of a position (contracts × current price). */
export function positionMarketValue(
  size: number,
  entryPrice: number,
  currentPrice: number,
): number {
  if (entryPrice <= 0 || size <= 0) return 0;
  const contracts = size / entryPrice;
  return (contracts * currentPrice) / 100 * 100; // size is dollars deployed; value scales with price
}

/** Simpler: market value = size * (currentPrice / entryPrice) */
export function positionCurrentValue(
  size: number,
  entryPrice: number,
  currentPrice: number,
): number {
  if (entryPrice <= 0 || size <= 0) return size;
  return (size * currentPrice) / entryPrice;
}

/** Sum of current market values across all open positions. */
export function totalOpenExposureUsd(
  positions: OpenPositionSnapshot[],
  excludeTicker?: string,
): number {
  let sum = 0;
  for (const p of positions) {
    if (excludeTicker && p.marketTicker === excludeTicker) continue;
    sum += positionCurrentValue(p.size, p.entryPrice, p.currentPrice);
  }
  return sum;
}

/** Net profit attributed to each market ticker. */
export function profitByTicker(
  closedTrades: Array<{ marketTicker: string; pnl: number }>,
  openPositions?: Array<{
    marketTicker: string;
    size: number;
    entryPrice: number;
    direction: "yes" | "no";
    currentPrice?: number;
  }>,
): Record<string, number> {
  const byTicker: Record<string, number> = {};
  for (const t of closedTrades) {
    byTicker[t.marketTicker] = (byTicker[t.marketTicker] ?? 0) + t.pnl;
  }
  if (openPositions) {
    for (const p of openPositions) {
      if (p.currentPrice == null) continue;
      const unrealized =
        p.size > 0 && p.entryPrice > 0
          ? (p.size * (p.currentPrice - p.entryPrice)) / p.entryPrice
          : 0;
      byTicker[p.marketTicker] = (byTicker[p.marketTicker] ?? 0) + unrealized;
    }
  }
  return byTicker;
}

/**
 * Consistency rule: if any market exceeds cap% of target, raise target so that
 * market's contribution equals exactly cap%. Never terminates the account.
 */
export function adjustedProfitTargetUsd(
  baseTargetUsd: number,
  profitByMarket: Record<string, number>,
  capPct: number,
): number {
  let adjusted = baseTargetUsd;
  for (const profit of Object.values(profitByMarket)) {
    if (profit <= 0) continue;
    const sharePct = (profit / adjusted) * 100;
    if (sharePct > capPct) {
      adjusted = Math.ceil(profit / (capPct / 100));
    }
  }
  return adjusted;
}

/** Calendar days from now until market expiry. */
export function daysUntilResolution(
  expiry: string,
  fromDate: Date = new Date(),
): number | null {
  if (!expiry) return null;
  const d = new Date(expiry);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - fromDate.getTime()) / 86_400_000);
}

export function isEligibleMarket(
  expiry: string,
  windowDays: number = MARKET_RESOLUTION_WINDOW_DAYS,
): boolean {
  const days = daysUntilResolution(expiry);
  if (days == null) return false;
  return days >= 0 && days <= windowDays;
}

export function drawdownPctFromEquity(params: {
  rules: ResolvedRules;
  startingBalance: number;
  equity: number;
  highWaterMarkUsd: number;
}): number {
  const { rules, startingBalance, equity, highWaterMarkUsd } = params;
  if (rules.drawdownMode === "static") {
    return startingBalance > 0
      ? Math.max(0, ((startingBalance - equity) / startingBalance) * 100)
      : 0;
  }
  const hwm = Math.max(highWaterMarkUsd, startingBalance);
  return hwm > 0 ? Math.max(0, ((hwm - equity) / hwm) * 100) : 0;
}

export function isDrawdownBreached(params: {
  rules: ResolvedRules;
  startingBalance: number;
  equity: number;
  highWaterMarkUsd: number;
  staticFloorUsd?: number;
}): boolean {
  const floor = drawdownFloorUsd({
    rules: params.rules,
    startingBalance: params.startingBalance,
    highWaterMarkUsd: params.highWaterMarkUsd,
    staticFloorUsd: params.staticFloorUsd,
  });
  return params.equity <= floor;
}

export function isChallengeExpired(windowEndDate: string): boolean {
  if (!windowEndDate) return false;
  return Date.now() > new Date(windowEndDate).getTime();
}

export function daysSinceLastTrade(lastTradeAt: number | null): number {
  if (!lastTradeAt) return Infinity;
  return Math.floor((Date.now() - lastTradeAt) / 86_400_000);
}

export function openingCommission(size: number, commissionPct: number): number {
  if (commissionPct <= 0 || size <= 0) return 0;
  return Math.round(size * commissionPct) / 100;
}

/** Full order validation against the Lenium rules framework. */
export function validateOrder(ctx: OrderValidationInput): OrderValidationResult {
  const { rules, newOrder, openPositions, challengeStatus, accountType } = ctx;

  if (accountType === "none") {
    return { ok: false, error: "No active account. Start a challenge first." };
  }
  if (challengeStatus === "breached") {
    return {
      ok: false,
      error: "Account breached — purchase a reset to trade again.",
    };
  }
  if (challengeStatus === "passed" && accountType === "challenge") {
    return {
      ok: false,
      error: "Challenge passed — activate your funded account to continue trading.",
    };
  }
  if (
    accountType === "challenge" &&
    ctx.windowEndDate &&
    isChallengeExpired(ctx.windowEndDate)
  ) {
    return {
      ok: false,
      error: "Challenge window expired — purchase a reset to try again.",
    };
  }

  const equity = equityUsd(ctx.startingBalance, ctx.currentProfit);
  if (
    isDrawdownBreached({
      rules,
      startingBalance: ctx.startingBalance,
      equity,
      highWaterMarkUsd: ctx.highWaterMarkUsd,
      staticFloorUsd: ctx.staticFloorUsd,
    })
  ) {
    return { ok: false, error: "Maximum drawdown reached — account is breached." };
  }

  if (newOrder.size <= 0 || !Number.isFinite(newOrder.size)) {
    return { ok: false, error: "Order size must be a positive number." };
  }

  if (newOrder.size > rules.maxPositionUsd) {
    return {
      ok: false,
      error: `Max position size is $${rules.maxPositionUsd.toLocaleString()} (${rules.maxPositionPct}% of balance).`,
    };
  }

  const existing = openPositions.find(
    (p) => p.marketTicker === newOrder.marketTicker,
  );
  const combinedSize = existing ? existing.size + newOrder.size : newOrder.size;
  if (combinedSize > rules.maxPositionUsd) {
    return {
      ok: false,
      error: `Combined position in this market would exceed $${rules.maxPositionUsd.toLocaleString()} (${rules.maxPositionPct}% limit).`,
    };
  }

  const currentExposure = totalOpenExposureUsd(openPositions);
  const newExposure = positionCurrentValue(
    newOrder.size,
    newOrder.entryPrice,
    newOrder.entryPrice,
  );
  if (currentExposure + newExposure > rules.maxExposureUsd) {
    const remaining = Math.max(0, rules.maxExposureUsd - currentExposure);
    return {
      ok: false,
      error: `Max total exposure is $${rules.maxExposureUsd.toLocaleString()} (${rules.maxExposurePct}% of balance). Remaining: $${Math.round(remaining).toLocaleString()}.`,
    };
  }

  if (
    newOrder.entryPrice < rules.openingPriceMinCents ||
    newOrder.entryPrice > rules.openingPriceMaxCents
  ) {
    return {
      ok: false,
      error: `Contracts must trade between ${rules.openingPriceMinCents}¢ and ${rules.openingPriceMaxCents}¢ YES to open a position.`,
    };
  }

  if (newOrder.marketExpiry && !isEligibleMarket(newOrder.marketExpiry)) {
    const days = daysUntilResolution(newOrder.marketExpiry);
    return {
      ok: false,
      error:
        days != null && days > rules.marketResolutionWindowDays
          ? `Market resolves in ${days} days — positions must be in markets resolving within ${rules.marketResolutionWindowDays} days.`
          : `Market is not eligible — must resolve within ${rules.marketResolutionWindowDays} calendar days.`,
    };
  }

  const commission = openingCommission(newOrder.size, rules.commissionPct);
  return { ok: true, commission };
}

/** Net withdrawable profit after split and commissions. */
export function netWithdrawableProfit(params: {
  grossProfit: number;
  traderSplitPct: number;
  commissionsPaid: number;
}): number {
  const { grossProfit, traderSplitPct, commissionsPaid } = params;
  const traderShare = Math.max(0, grossProfit * (traderSplitPct / 100));
  return Math.max(0, traderShare - commissionsPaid);
}
