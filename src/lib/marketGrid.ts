/** Shared market grid layout — used by MarketGrid everywhere. */
export const MARKET_GRID_GAP = 16;
export const MARKET_CARD_MIN_HEIGHT = 220;

/** Column count from container width (2 / 1 at 900px). */
export function marketGridColumns(containerWidth: number): number {
  if (containerWidth < 900) return 1;
  return 2;
}

export const MARKET_GRID_ROW_HEIGHT =
  MARKET_CARD_MIN_HEIGHT + MARKET_GRID_GAP;
