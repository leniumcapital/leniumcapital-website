import { create } from "zustand";

/**
 * Client-side UI state for the authenticated app. Account data (type, tier,
 * balance, status) lives in the session, not here — these stores only hold
 * ephemeral UI state that must be wiped on logout.
 */

type UIState = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  reset: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  reset: () => set({ sidebarOpen: false }),
}));

type WatchlistState = {
  tickers: string[];
  add: (ticker: string) => void;
  remove: (ticker: string) => void;
  reset: () => void;
};

export const useWatchlistStore = create<WatchlistState>((set) => ({
  tickers: [],
  add: (ticker) =>
    set((s) => ({ tickers: Array.from(new Set([...s.tickers, ticker])) })),
  remove: (ticker) =>
    set((s) => ({ tickers: s.tickers.filter((t) => t !== ticker) })),
  reset: () => set({ tickers: [] }),
}));

/** Registry of every store that should be cleared on logout. */
const RESETTABLE_STORES = [useUIStore, useWatchlistStore];

/** Clears all Zustand stores. Call this on logout before redirecting home. */
export function resetAllStores() {
  for (const store of RESETTABLE_STORES) {
    store.getState().reset();
  }
}
