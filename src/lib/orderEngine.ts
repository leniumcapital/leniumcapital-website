/**
 * Simulated order execution for challenge accounts. Orders fill at the live
 * Kalshi price fetched server-side — the simulation mirrors real markets but
 * never touches a real Kalshi account.
 */
import "server-only";

import { randomUUID } from "crypto";
import { fetchMarketPrice } from "@/lib/kalshi";
import {
  TIERS,
  OPENING_PRICE_MIN_CENTS,
  OPENING_PRICE_MAX_CENTS,
  maxPositionUsd,
} from "@/lib/data";

export type OrderRequest = {
  marketTicker: string;
  direction: "yes" | "no";
  size: number;
};

export type OrderFill = {
  positionId: string;
  marketTicker: string;
  question: string;
  direction: "yes" | "no";
  size: number;
  entryPrice: number;
  openedAt: number;
};

export type OrderResult =
  | { ok: true; fill: OrderFill }
  | { ok: false; error: string };

/** Max position size in dollars for a tier at the given balance. */
export function maxPositionForTier(tierSize: number, balance?: number): number {
  const tier = TIERS.find((t) => t.size === tierSize);
  if (!tier) return 0;
  return maxPositionUsd(tier, balance ?? tier.size);
}

/**
 * Validate and execute a simulated order at the live market price.
 * All inputs are untrusted — this runs at the API boundary.
 */
export async function executeOrder(
  request: OrderRequest,
  tierSize: number,
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

  const maxPosition = maxPositionForTier(tierSize);
  if (maxPosition > 0 && size > maxPosition) {
    return {
      ok: false,
      error: `Max position size for your tier is $${maxPosition.toLocaleString()}.`,
    };
  }

  const price = await fetchMarketPrice(marketTicker);
  if (!price) {
    return { ok: false, error: "Could not fetch a live price for this market." };
  }

  const entryPrice = direction === "yes" ? price.yesPrice : price.noPrice;
  if (entryPrice < OPENING_PRICE_MIN_CENTS || entryPrice > OPENING_PRICE_MAX_CENTS) {
    return {
      ok: false,
      error: `Contracts must trade between ${OPENING_PRICE_MIN_CENTS}¢ and ${OPENING_PRICE_MAX_CENTS}¢ YES to open a position.`,
    };
  }
  if (entryPrice <= 0 || entryPrice >= 100) {
    return { ok: false, error: "Market is not currently tradable." };
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
