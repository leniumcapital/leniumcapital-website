import { create } from "zustand";

export type ViewMode = "grid" | "list";
export type SortOrder = "volume" | "expiry" | "movement" | "newest";

export type OnboardingStep = "mode" | "demo" | "live";

interface UIState {
  activeCategory: string;
  searchQuery: string;
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
  /** First-login flow: choose demo vs live, then account or plan. */
  onboardingOpen: boolean;
  onboardingInitialStep: OnboardingStep;
  /** Shown when a non-funded user tries to switch to live mode. */
  accountGateOpen: boolean;
  /** Hero carousel index on the Trending tab. */
  heroCarouselIndex: number;
  /** Top featured event tickers for the hero carousel. */
  heroCarouselMarkets: string[];
  /** Active sidebar shortcut filter (series ticker or special id). */
  activeSidebarFilter: string | null;
  setCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setEventSearch: (query: string) => void;
  setSubCategoryFilter: (subCategory: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortOrder: (order: SortOrder) => void;
  setMarketsScrollTop: (top: number) => void;
  setHeroCarouselIndex: (index: number) => void;
  setHeroCarouselMarkets: (tickers: string[]) => void;
  setActiveSidebarFilter: (filter: string | null) => void;
  openChallengeModal: () => void;
  closeChallengeModal: () => void;
  openOnboarding: (step?: OnboardingStep) => void;
  closeOnboarding: () => void;
  openAccountGate: () => void;
  closeAccountGate: () => void;
  reset: () => void;
}

const initial = {
  activeCategory: "Trending",
  searchQuery: "",
  viewMode: "grid" as ViewMode,
  sortOrder: "volume" as SortOrder,
  marketsScrollTop: 0,
  eventSearch: "",
  subCategoryFilter: "All Markets",
  challengeModalOpen: false,
  onboardingOpen: false,
  onboardingInitialStep: "mode" as OnboardingStep,
  accountGateOpen: false,
  heroCarouselIndex: 0,
  heroCarouselMarkets: [] as string[],
  activeSidebarFilter: null as string | null,
};

export const useUiStore = create<UIState>()((set) => ({
  ...initial,
  setCategory: (activeCategory) =>
    set({
      activeCategory,
      eventSearch: "",
      subCategoryFilter: "All Markets",
      activeSidebarFilter: null,
      heroCarouselIndex: 0,
    }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setEventSearch: (eventSearch) => set({ eventSearch }),
  setSubCategoryFilter: (subCategoryFilter) => set({ subCategoryFilter }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setMarketsScrollTop: (marketsScrollTop) => set({ marketsScrollTop }),
  setHeroCarouselIndex: (heroCarouselIndex) => set({ heroCarouselIndex }),
  setHeroCarouselMarkets: (heroCarouselMarkets) => set({ heroCarouselMarkets }),
  setActiveSidebarFilter: (activeSidebarFilter) =>
    set({ activeSidebarFilter, heroCarouselIndex: 0 }),
  openChallengeModal: () => set({ challengeModalOpen: true }),
  closeChallengeModal: () => set({ challengeModalOpen: false }),
  openOnboarding: (step = "mode") =>
    set({ onboardingOpen: true, onboardingInitialStep: step }),
  closeOnboarding: () =>
    set({ onboardingOpen: false, onboardingInitialStep: "mode" }),
  openAccountGate: () => set({ accountGateOpen: true }),
  closeAccountGate: () => set({ accountGateOpen: false }),
  reset: () => set(initial),
}));
