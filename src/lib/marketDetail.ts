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

/** One outcome row on an event card (the favored contracts). */
export type EventOutcome = {
  ticker: string;
  name: string;
  yesPrice: number;
  volume: number;
};

/** A Kalshi event aggregated for the dashboard grid — one card per event. */
export type DashboardEvent = {
  eventTicker: string;
  seriesTicker: string;
  title: string;
  category: string;
  /** Sport name for Sports events (World Cup, Basketball, ...). */
  subCategory?: string;
  closeTime: string;
  /** Sum of volume across all tradable contracts in the event. */
  totalVolume: number;
  volume24h: number;
  /** Count of tradable contracts (what Kalshi shows as "N markets"). */
  marketCount: number;
  /** Top outcomes by probability — favored first. */
  outcomes: EventOutcome[];
  /** Most-traded contract; navigation target for the card. */
  leaderTicker: string;
};
