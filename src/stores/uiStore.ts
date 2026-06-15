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
  /** Active subcategory in the left sidebar ("All Markets" = entire category). */
  subCategoryFilter: string;
  /** Challenge onboarding overlay — never navigates away from dashboard. */
  challengeModalOpen: boolean;
  /** Shown when a non-funded user tries to switch to live mode. */
  accountGateOpen: boolean;
  /** Active featured-event series filter on the Trending tab. */
  selectedEventSeries: string | null;
  setSelectedEventSeries: (seriesTicker: string | null) => void;
  clearEventSeriesFilter: () => void;
  setCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setEventSearch: (query: string) => void;
  setSubCategoryFilter: (subCategory: string) => void;
  openDrawer: (marketTicker: string) => void;
  closeDrawer: () => void;
  setViewMode: (mode: ViewMode) => void;
  setSortOrder: (order: SortOrder) => void;
  setMarketsScrollTop: (top: number) => void;
  openChallengeModal: () => void;
  closeChallengeModal: () => void;
  openAccountGate: () => void;
  closeAccountGate: () => void;
  reset: () => void;
}

const initial = {
  activeCategory: "Trending",
  searchQuery: "",
  drawerOpen: false,
  selectedMarketTicker: null as string | null,
  viewMode: "grid" as ViewMode,
  sortOrder: "volume" as SortOrder,
  marketsScrollTop: 0,
  eventSearch: "",
  subCategoryFilter: "All Markets",
  challengeModalOpen: false,
  accountGateOpen: false,
  selectedEventSeries: null as string | null,
};

export const useUiStore = create<UIState>()((set) => ({
  ...initial,
  setCategory: (activeCategory) =>
    set({
      activeCategory,
      eventSearch: "",
      subCategoryFilter: "All Markets",
      selectedEventSeries: null,
    }),
  setSelectedEventSeries: (selectedEventSeries) => set({ selectedEventSeries }),
  clearEventSeriesFilter: () => set({ selectedEventSeries: null }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setEventSearch: (eventSearch) => set({ eventSearch }),
  setSubCategoryFilter: (subCategoryFilter) => set({ subCategoryFilter }),
  openDrawer: (selectedMarketTicker) =>
    set({ drawerOpen: true, selectedMarketTicker, searchQuery: "" }),
  closeDrawer: () => set({ drawerOpen: false }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setMarketsScrollTop: (marketsScrollTop) => set({ marketsScrollTop }),
  openChallengeModal: () => set({ challengeModalOpen: true }),
  closeChallengeModal: () => set({ challengeModalOpen: false }),
  openAccountGate: () => set({ accountGateOpen: true }),
  closeAccountGate: () => set({ accountGateOpen: false }),
  reset: () => set(initial),
}));
