/**
 * Shared shapes for the market detail page. Kept separate from lib/kalshi.ts
 * (which is server-only) so client components can import these types.
 */

export type MarketOutcome = {
  ticker: string;
  /** Outcome label, e.g. a team or candidate name. */
  name: string;
  yesPrice: number;
  noPrice: number;
  /** Previous (24h) price in cents; 0 when unknown. */
  prevPrice: number;
  volume: number;
};

export type MarketDetail = {
  ticker: string;
  question: string;
  eventTitle: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  /** Previous (24h) price in cents; 0 when unknown. */
  prevPrice: number;
  volume: number;
  volume24h: number;
  expiry: string;
  status: string;
  rulesPrimary: string;
  rulesSecondary: string;
  /** All outcomes in the event; length > 1 means multi-outcome market. */
  outcomes: MarketOutcome[];
};

export type ChartRange = "1D" | "1W" | "1M" | "ALL";
