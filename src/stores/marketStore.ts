import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { DashboardEvent } from "@/lib/marketDetail";
import { compareTrendingEvents } from "@/lib/marketSync";

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
  /** Volume traded in the last 24 hours — drives Trending. */
  volume24h: number;
  /** ISO expiry timestamp. */
  expiry: string;
  /** Full intraday price history for the drawer chart. */
  priceHistory: PricePoint[];
  /** Real 24h price series for card sparklines (live ticks + candlesticks). */
  sparklineData: number[];
  /** YES price 24 hours ago — drives sparkline color. */
  open24h: number;
  /** True once the real candlestick history has been fetched for this market. */
  historyLoaded?: boolean;
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
  /** Kalshi events aggregated for the grid — one card per event. */
  events: Record<string, DashboardEvent>;
  /** Event tickers in Kalshi trending order (24h volume). */
  eventOrder: string[];
  lastBatchAt: number;
  /** Last full catalog mirror from Kalshi — drives trending resort. */
  catalogSyncedAt: number;
  /** When each event first appeared in our feed (for "New" lists). */
  eventFirstSeenAt: Record<string, number>;
  setMarket: (market: Market) => void;
  setMarkets: (markets: Market[]) => void;
  /** @deprecated Prefer syncCatalogFromKalshi for live feed updates. */
  setEvents: (events: DashboardEvent[]) => void;
  /** Replace catalog from Kalshi: add new events, remove closed ones, resort trending. */
  syncCatalogFromKalshi: (payload: {
    events: DashboardEvent[];
    markets: Market[];
  }) => void;
  /** Populate the store from the initial REST fetch (alias of setMarkets). */
  initializeMarkets: (markets: Market[]) => void;
  updatePrice: (update: PriceUpdate) => void;
  /** Single setState for a whole accumulator flush — one React notification. */
  batchUpdatePrices: (updates: Record<string, PriceUpdate>) => void;
  setPriceHistory: (ticker: string, history: PricePoint[]) => void;
  /** Seed the sparkline + 24h open from real candlestick history (once). */
  seedSparklineFromHistory: (ticker: string, points: PricePoint[]) => void;
  reset: () => void;
}

/** Merge a markets snapshot into draft state, preserving richer client-side
 *  data already accumulated: drawer history, candlestick-seeded sparklines,
 *  and the 24h open. */
function mergeMarkets(
  s: { markets: Record<string, Market>; order: string[] },
  markets: Market[],
): void {
  for (const m of markets) {
    if (!s.markets[m.ticker]) s.order.push(m.ticker);
    const prev = s.markets[m.ticker];
    // API payloads omit priceHistory (and could omit sparklineData), so
    // always normalize to arrays — live updates push into these.
    const incomingSpark = m.sparklineData ?? [];
    s.markets[m.ticker] = {
      ...m,
      priceHistory: prev?.priceHistory?.length
        ? prev.priceHistory
        : (m.priceHistory ?? []),
      sparklineData:
        prev && prev.sparklineData.length > incomingSpark.length
          ? prev.sparklineData
          : incomingSpark,
      open24h: prev?.historyLoaded ? prev.open24h : m.open24h,
      historyLoaded: prev?.historyLoaded ?? false,
    };
  }
}

export const useMarketStore = create<MarketState>()(
  immer((set) => ({
    markets: {},
    order: [],
    events: {},
    eventOrder: [],
    lastBatchAt: 0,
    catalogSyncedAt: 0,
    eventFirstSeenAt: {},

    setMarket: (market) =>
      set((s) => {
        if (!s.markets[market.ticker]) s.order.push(market.ticker);
        s.markets[market.ticker] = market;
      }),

    setMarkets: (markets) =>
      set((s) => {
        mergeMarkets(s, markets);
      }),

    setEvents: (events) =>
      set((s) => {
        for (const ev of events) {
          if (!s.events[ev.eventTicker]) s.eventOrder.push(ev.eventTicker);
          s.events[ev.eventTicker] = ev;
        }
      }),

    syncCatalogFromKalshi: ({ events, markets }) =>
      set((s) => {
        const incomingEventTickers = new Set(events.map((ev) => ev.eventTicker));
        const incomingMarketTickers = new Set(markets.map((m) => m.ticker));

        // Drop events Kalshi no longer returns (resolved, closed, delisted).
        for (const ticker of Object.keys(s.events)) {
          if (!incomingEventTickers.has(ticker)) {
            delete s.events[ticker];
          }
        }

        for (const ev of events) {
          s.events[ev.eventTicker] = ev;
          if (!s.eventFirstSeenAt[ev.eventTicker]) {
            s.eventFirstSeenAt[ev.eventTicker] = Date.now();
          }
        }

        // Drop first-seen timestamps for removed events.
        for (const ticker of Object.keys(s.eventFirstSeenAt)) {
          if (!incomingEventTickers.has(ticker)) {
            delete s.eventFirstSeenAt[ticker];
          }
        }

        s.eventOrder = [...events]
          .sort(compareTrendingEvents)
          .map((ev) => ev.eventTicker);

        // Drop markets no longer in the open feed.
        for (const ticker of [...s.order]) {
          if (!incomingMarketTickers.has(ticker)) {
            delete s.markets[ticker];
          }
        }
        s.order = s.order.filter((t) => incomingMarketTickers.has(t));

        mergeMarkets(s, markets);
        s.catalogSyncedAt = Date.now();
        s.lastBatchAt = Date.now();
      }),

    initializeMarkets: (markets) =>
      set((s) => {
        mergeMarkets(s, markets);
      }),

    updatePrice: ({ ticker, yesPrice, noPrice, volume }) =>
      set((s) => {
        const m = s.markets[ticker];
        if (!m) return;
        m.yesPrice = yesPrice;
        m.noPrice = noPrice;
        if (volume != null) m.volume = volume;
        (m.sparklineData ??= []).push(yesPrice);
        if (m.sparklineData.length > 48) m.sparklineData.shift();
        (m.priceHistory ??= []).push({ t: Date.now(), p: yesPrice });
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
          (m.sparklineData ??= []).push(u.yesPrice);
          if (m.sparklineData.length > 48) m.sparklineData.shift();
          (m.priceHistory ??= []).push({ t: now, p: u.yesPrice });
          if (m.priceHistory.length > 2000) m.priceHistory.shift();
        }
        s.lastBatchAt = now;
      }),

    setPriceHistory: (ticker, history) =>
      set((s) => {
        const m = s.markets[ticker];
        if (m) m.priceHistory = history;
      }),

    seedSparklineFromHistory: (ticker, points) =>
      set((s) => {
        const m = s.markets[ticker];
        if (!m) return;
        m.historyLoaded = true;
        if (points.length < 2) return;
        const closes = points.map((p) => p.p);
        // Keep any live ticks that arrived after the history snapshot.
        const liveTail = m.sparklineData.slice(-4);
        m.sparklineData = [...closes, ...liveTail].slice(-48);
        m.open24h = closes[0];
      }),

    reset: () =>
      set(() => ({
        markets: {},
        order: [],
        events: {},
        eventOrder: [],
        lastBatchAt: 0,
        catalogSyncedAt: 0,
        eventFirstSeenAt: {},
      })),
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
