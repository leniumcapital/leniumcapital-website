/**
 * Simulated order execution for challenge accounts. Orders fill at the live
 * Kalshi price fetched server-side — the simulation mirrors real markets but
 * never touches a real Kalshi account.
 */
import "server-only";

import { randomUUID } from "crypto";
import { fetchMarketPrice } from "@/lib/kalshi";
import {
  resolveTierForAccount,
  resolveRules,
  validateOrder,
} from "@/lib/rules";
import type { OpenPositionSnapshot } from "@/lib/rules";
import type { TradingAccountRecord } from "@/lib/trading-accounts";

export type OrderRequest = {
  marketTicker: string;
  direction: "yes" | "no";
  size: number;
  marketExpiry?: string;
  openPositions?: OpenPositionSnapshot[];
  currentProfit?: number;
  highWaterMarkUsd?: number;
  staticFloorUsd?: number;
  windowEndDate?: string;
};

export type OrderFill = {
  positionId: string;
  marketTicker: string;
  question: string;
  direction: "yes" | "no";
  size: number;
  entryPrice: number;
  openedAt: number;
  commission: number;
  balance: number;
};

export type OrderResult =
  | { ok: true; fill: OrderFill }
  | { ok: false; error: string };

/**
 * Validate and execute a simulated order at the live market price.
 * All inputs are untrusted — this runs at the API boundary.
 */
export async function executeOrder(
  request: OrderRequest,
  account: TradingAccountRecord,
  openPositions: OpenPositionSnapshot[] = [],
): Promise<OrderResult> {
  const { marketTicker, direction, size } = request;

  if (typeof marketTicker !== "string" || !marketTicker.trim()) {
    return { ok: false, error: "Missing market ticker." };
  }
  if (direction !== "yes" && direction !== "no") {
    return { ok: false, error: "Direction must be yes or no." };
  }
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) {
    return { ok: false, error: "Order size must be a positive number." };
  }

  const tier = resolveTierForAccount(account.tier);
  if (!tier) {
    return { ok: false, error: "Invalid account tier." };
  }

  const phase = account.accountType === "funded" ? "funded" : "evaluation";
  const currentProfit = request.currentProfit ?? 0;
  const equity = tier.size + currentProfit;

  const rules = resolveRules({
    tier,
    addons: account.purchasedAddons,
    phase,
    currentBalance: equity,
  });

  const price = await fetchMarketPrice(marketTicker);
  if (!price) {
    return { ok: false, error: "Could not fetch a live price for this market." };
  }

  const entryPrice = direction === "yes" ? price.yesPrice : price.noPrice;
  if (entryPrice <= 0 || entryPrice >= 100) {
    return { ok: false, error: "Market is not currently tradable." };
  }

  const validation = validateOrder({
    rules,
    startingBalance: tier.size,
    currentProfit,
    highWaterMarkUsd: request.highWaterMarkUsd ?? tier.size,
    staticFloorUsd: request.staticFloorUsd ?? 0,
    openPositions,
    newOrder: {
      size,
      direction,
      marketTicker,
      entryPrice,
      marketExpiry: request.marketExpiry ?? price.expiry,
    },
    challengeStatus: account.challengeStatus,
    accountType: account.accountType,
    windowEndDate: request.windowEndDate,
  });

  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const totalCost = size + validation.commission;
  if (totalCost > account.balance) {
    return {
      ok: false,
      error: `Insufficient balance — $${Math.round(account.balance).toLocaleString()} available.`,
    };
  }

  return {
    ok: true,
    fill: {
      positionId: randomUUID(),
      marketTicker,
      question: price.question,
      direction,
      size: Math.round(size * 100) / 100,
      entryPrice,
      openedAt: Date.now(),
      commission: validation.commission,
      balance: account.balance - totalCost,
    },
  };
}

/** Fetch the live exit price for closing a position. */
export async function executeClose(
  marketTicker: string,
  direction: "yes" | "no",
): Promise<{ ok: true; exitPrice: number } | { ok: false; error: string }> {
  const price = await fetchMarketPrice(marketTicker);
  if (!price) {
    return { ok: false, error: "Could not fetch a live price for this market." };
  }
  return {
    ok: true,
    exitPrice: direction === "yes" ? price.yesPrice : price.noPrice,
  };
}
