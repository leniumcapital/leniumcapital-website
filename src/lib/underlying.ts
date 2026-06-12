/**
 * Underlying-asset detection for financial markets.
 *
 * Price-ladder markets ("BTC price on Jun 12 at 5pm?") are about a real
 * financial instrument. For those, the detail page charts the LIVE price of
 * the instrument itself (like Kalshi) instead of contract probabilities.
 *
 * Client-safe (pure string matching); the API route imports the same symbol
 * whitelist so it can never be used as an open proxy.
 */

export type UnderlyingAsset = {
  /** Yahoo Finance chart symbol, e.g. "BTC-USD" or "^GSPC". */
  symbol: string;
  /** Human-readable instrument name, e.g. "Bitcoin". */
  name: string;
  /** Display decimals for prices. */
  decimals: number;
};

type Rule = { pattern: RegExp; asset: UnderlyingAsset };

// Order matters where keywords overlap (Brent before generic oil).
const RULES: Rule[] = [
  { pattern: /\b(btc|bitcoin)\b/i, asset: { symbol: "BTC-USD", name: "Bitcoin", decimals: 0 } },
  { pattern: /\b(eth|ethereum)\b/i, asset: { symbol: "ETH-USD", name: "Ethereum", decimals: 2 } },
  { pattern: /\b(sol|solana)\b/i, asset: { symbol: "SOL-USD", name: "Solana", decimals: 2 } },
  { pattern: /\bxrp\b/i, asset: { symbol: "XRP-USD", name: "XRP", decimals: 4 } },
  { pattern: /\b(doge|dogecoin)\b/i, asset: { symbol: "DOGE-USD", name: "Dogecoin", decimals: 4 } },
  { pattern: /nasdaq/i, asset: { symbol: "^NDX", name: "Nasdaq-100", decimals: 0 } },
  { pattern: /s&p\s*500|\bspx\b/i, asset: { symbol: "^GSPC", name: "S&P 500", decimals: 0 } },
  { pattern: /dow jones|\bdjia\b/i, asset: { symbol: "^DJI", name: "Dow Jones", decimals: 0 } },
  { pattern: /\brussell\b/i, asset: { symbol: "^RUT", name: "Russell 2000", decimals: 0 } },
  { pattern: /\bbrent\b/i, asset: { symbol: "BZ=F", name: "Brent Crude Oil", decimals: 2 } },
  { pattern: /\bwti\b|crude oil|oil price/i, asset: { symbol: "CL=F", name: "WTI Crude Oil", decimals: 2 } },
  { pattern: /\bgold\b/i, asset: { symbol: "GC=F", name: "Gold", decimals: 1 } },
  { pattern: /\bsilver\b/i, asset: { symbol: "SI=F", name: "Silver", decimals: 2 } },
  { pattern: /natural gas|\bnatgas\b/i, asset: { symbol: "NG=F", name: "Natural Gas", decimals: 3 } },
  { pattern: /eur\/usd|\beuro\b/i, asset: { symbol: "EURUSD=X", name: "EUR/USD", decimals: 4 } },
  { pattern: /usd\/jpy|japanese yen/i, asset: { symbol: "JPY=X", name: "USD/JPY", decimals: 2 } },
  { pattern: /\b(tesla|tsla)\b/i, asset: { symbol: "TSLA", name: "Tesla", decimals: 2 } },
  { pattern: /\b(nvidia|nvda)\b/i, asset: { symbol: "NVDA", name: "Nvidia", decimals: 2 } },
  { pattern: /\b(apple|aapl)\b/i, asset: { symbol: "AAPL", name: "Apple", decimals: 2 } },
];

/** Whitelist used by the /api/underlying route. */
export const UNDERLYING_SYMBOLS: ReadonlySet<string> = new Set(
  RULES.map((r) => r.asset.symbol),
);

const ALLOWED_CATEGORIES = new Set([
  "Crypto",
  "Financials",
  "Economics",
  "Companies",
]);

/** Markets about a price level, not just any mention of an asset. */
const PRICE_CONTEXT =
  /\b(price|above|below|between|close[sd]?|open|high|low|reach|hit)\b/i;

/**
 * Detect the underlying instrument for a market, or null when the market is
 * not about a tradable financial price (elections, sports, weather, ...).
 */
export function detectUnderlying(market: {
  question: string;
  eventTitle: string;
  category: string;
}): UnderlyingAsset | null {
  if (!ALLOWED_CATEGORIES.has(market.category)) return null;
  const text = `${market.eventTitle} ${market.question}`;
  if (!PRICE_CONTEXT.test(text)) return null;
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return rule.asset;
  }
  return null;
}

/** Parse the strike level from an outcome name, e.g. "$61,000 or above". */
export function parseStrike(name: string): number | null {
  const m = name.match(/\$?\s*([\d,]+(?:\.\d+)?)/);
  if (!m) return null;
  const v = parseFloat(m[1].replace(/,/g, ""));
  return Number.isFinite(v) && v > 0 ? v : null;
}
