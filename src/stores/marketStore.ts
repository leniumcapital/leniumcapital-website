import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export type PricePoint = {
  /** Unix ms timestamp. */
  t: number;
  /** YES price in percent (0–100). */
  p: number;
};

export type Market = {
  ticker: string;
  question: string;
  category: string;
  /** YES price in percent / cents (0–100). */
  yesPrice: number;
  /** NO price in percent / cents (0–100). */
  noPrice: number;
  /** Total traded volume in dollars. */
  volume: number;
  /** ISO expiry timestamp. */
  expiry: string;
  /** Full intraday price history for the drawer chart. */
  priceHistory: PricePoint[];
  /** Compact 24h series for card sparklines. */
  sparklineData: number[];
  /** YES price 24 hours ago — drives sparkline color. */
  open24h: number;
};

export type PriceUpdate = {
  ticker: string;
  yesPrice: number;
  noPrice: number;
  volume?: number;
};

interface MarketState {
  markets: Record<string, Market>;
  /** Insertion order preserved for "newest" sorting. */
  order: string[];
  lastBatchAt: number;
  setMarket: (market: Market) => void;
  setMarkets: (markets: Market[]) => void;
  updatePrice: (update: PriceUpdate) => void;
  /** Single setState for a whole accumulator flush — one React notification. */
  batchUpdatePrices: (updates: Record<string, PriceUpdate>) => void;
  setPriceHistory: (ticker: string, history: PricePoint[]) => void;
  reset: () => void;
}

export const useMarketStore = create<MarketState>()(
  immer((set) => ({
    markets: {},
    order: [],
    lastBatchAt: 0,

    setMarket: (market) =>
      set((s) => {
        if (!s.markets[market.ticker]) s.order.push(market.ticker);
        s.markets[market.ticker] = market;
      }),

    setMarkets: (markets) =>
      set((s) => {
        for (const m of markets) {
          if (!s.markets[m.ticker]) s.order.push(m.ticker);
          // Preserve any richer history already loaded for the drawer.
          const prev = s.markets[m.ticker];
          s.markets[m.ticker] = {
            ...m,
            priceHistory: prev?.priceHistory?.length
              ? prev.priceHistory
              : m.priceHistory,
          };
        }
      }),

    updatePrice: ({ ticker, yesPrice, noPrice, volume }) =>
      set((s) => {
        const m = s.markets[ticker];
        if (!m) return;
        m.yesPrice = yesPrice;
        m.noPrice = noPrice;
        if (volume != null) m.volume = volume;
        m.sparklineData.push(yesPrice);
        if (m.sparklineData.length > 48) m.sparklineData.shift();
        m.priceHistory.push({ t: Date.now(), p: yesPrice });
        if (m.priceHistory.length > 2000) m.priceHistory.shift();
      }),

    batchUpdatePrices: (updates) =>
      set((s) => {
        const now = Date.now();
        for (const ticker of Object.keys(updates)) {
          const u = updates[ticker];
          const m = s.markets[ticker];
          if (!m) continue;
          if (m.yesPrice === u.yesPrice && u.volume == null) continue;
          m.yesPrice = u.yesPrice;
          m.noPrice = u.noPrice;
          if (u.volume != null) m.volume = u.volume;
          m.sparklineData.push(u.yesPrice);
          if (m.sparklineData.length > 48) m.sparklineData.shift();
          m.priceHistory.push({ t: now, p: u.yesPrice });
          if (m.priceHistory.length > 2000) m.priceHistory.shift();
        }
        s.lastBatchAt = now;
      }),

    setPriceHistory: (ticker, history) =>
      set((s) => {
        const m = s.markets[ticker];
        if (m) m.priceHistory = history;
      }),

    reset: () => set(() => ({ markets: {}, order: [], lastBatchAt: 0 })),
  })),
);

/** Category contract counts, derived live. Stable selector helper. */
export function selectCategoryCounts(s: MarketState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ticker of s.order) {
    const cat = s.markets[ticker]?.category;
    if (!cat) continue;
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  return counts;
}
