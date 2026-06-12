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
  setCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  openDrawer: (marketTicker: string) => void;
  closeDrawer: () => void;
  setViewMode: (mode: ViewMode) => void;
  setSortOrder: (order: SortOrder) => void;
  reset: () => void;
}

const initial = {
  activeCategory: "All Markets",
  searchQuery: "",
  drawerOpen: false,
  selectedMarketTicker: null as string | null,
  viewMode: "grid" as ViewMode,
  sortOrder: "volume" as SortOrder,
};

export const useUiStore = create<UIState>()((set) => ({
  ...initial,
  setCategory: (activeCategory) => set({ activeCategory }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  openDrawer: (selectedMarketTicker) =>
    set({ drawerOpen: true, selectedMarketTicker, searchQuery: "" }),
  closeDrawer: () => set({ drawerOpen: false }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  reset: () => set(initial),
}));
