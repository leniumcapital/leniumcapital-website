import { create } from "zustand";
import { useMarketStore } from "@/stores/marketStore";
import { useAccountStore } from "@/stores/accountStore";
import { usePositionStore } from "@/stores/positionStore";
import { useChallengeStore } from "@/stores/challengeStore";
import { useConnectionStore } from "@/stores/connectionStore";
import { useUiStore } from "@/stores/uiStore";

/**
 * Client-side state for the authenticated app. Account data originates in the
 * session; the stores hold live dashboard state that must be wiped on logout.
 */

type LegacyUIState = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  reset: () => void;
};

export const useUIStore = create<LegacyUIState>((set) => ({
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
const RESETTABLE_STORES = [
  useUIStore,
  useWatchlistStore,
  useMarketStore,
  useAccountStore,
  usePositionStore,
  useChallengeStore,
  useConnectionStore,
  useUiStore,
];

/** Clears all Zustand stores. Call this on logout before redirecting home. */
export function resetAllStores() {
  for (const store of RESETTABLE_STORES) {
    store.getState().reset();
  }
}
