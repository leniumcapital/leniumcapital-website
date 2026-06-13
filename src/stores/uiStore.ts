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
  /** Active sport in the Sports tab's sub-menu ("All" = every sport). */
  sportsFilter: string;
  /** Challenge onboarding overlay — never navigates away from dashboard. */
  challengeModalOpen: boolean;
  setCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setEventSearch: (query: string) => void;
  setSportsFilter: (sport: string) => void;
  openDrawer: (marketTicker: string) => void;
  closeDrawer: () => void;
  setViewMode: (mode: ViewMode) => void;
  setSortOrder: (order: SortOrder) => void;
  setMarketsScrollTop: (top: number) => void;
  openChallengeModal: () => void;
  closeChallengeModal: () => void;
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
  sportsFilter: "All",
  challengeModalOpen: false,
};

export const useUiStore = create<UIState>()((set) => ({
  ...initial,
  setCategory: (activeCategory) =>
    set({ activeCategory, eventSearch: "", sportsFilter: "All" }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setEventSearch: (eventSearch) => set({ eventSearch }),
  setSportsFilter: (sportsFilter) => set({ sportsFilter }),
  openDrawer: (selectedMarketTicker) =>
    set({ drawerOpen: true, selectedMarketTicker, searchQuery: "" }),
  closeDrawer: () => set({ drawerOpen: false }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setMarketsScrollTop: (marketsScrollTop) => set({ marketsScrollTop }),
  openChallengeModal: () => set({ challengeModalOpen: true }),
  closeChallengeModal: () => set({ challengeModalOpen: false }),
  reset: () => set(initial),
}));
