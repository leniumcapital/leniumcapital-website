import { create } from "zustand";

export type ViewMode = "grid" | "list";
export type SortOrder = "volume" | "expiry" | "movement" | "newest";

interface UIState {
  activeCategory: string;
  searchQuery: string;
  drawerOpen: boolean;
  selectedMarketTicker: string | null;
  viewMode: ViewMode;
  sortOrder: SortOrder;
  /** Saved scroll offset of the markets grid for back-navigation restore. */
  marketsScrollTop: number;
  /** Page-level event search on the markets browser (separate from top bar). */
  eventSearch: string;
  setCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setEventSearch: (query: string) => void;
  openDrawer: (marketTicker: string) => void;
  closeDrawer: () => void;
  setViewMode: (mode: ViewMode) => void;
  setSortOrder: (order: SortOrder) => void;
  setMarketsScrollTop: (top: number) => void;
  reset: () => void;
}

const initial = {
  activeCategory: "All Markets",
  searchQuery: "",
  drawerOpen: false,
  selectedMarketTicker: null as string | null,
  viewMode: "grid" as ViewMode,
  sortOrder: "volume" as SortOrder,
  marketsScrollTop: 0,
  eventSearch: "",
};

export const useUiStore = create<UIState>()((set) => ({
  ...initial,
  setCategory: (activeCategory) => set({ activeCategory, eventSearch: "" }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setEventSearch: (eventSearch) => set({ eventSearch }),
  openDrawer: (selectedMarketTicker) =>
    set({ drawerOpen: true, selectedMarketTicker, searchQuery: "" }),
  closeDrawer: () => set({ drawerOpen: false }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setMarketsScrollTop: (marketsScrollTop) => set({ marketsScrollTop }),
  reset: () => set(initial),
}));
