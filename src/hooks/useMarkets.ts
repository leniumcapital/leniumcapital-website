"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { useMarketStore, type Market } from "@/stores/marketStore";
import { useUiStore, type SortOrder } from "@/stores/uiStore";
import type { DashboardEvent } from "@/lib/marketDetail";
import {
  PRIMARY_TABS,
  SUBCATEGORY_ORDER,
  TABS_WITHOUT_SIDEBAR,
  sortSubcategories,
} from "@/lib/marketCategories";

export type MarketsPayload = {
  markets: Market[];
  events: DashboardEvent[];
};

/** Initial market fetch via React Query (the live feed keeps prices fresh). */
export function useMarketsQuery() {
  return useQuery({
    queryKey: ["kalshi-markets"],
    queryFn: async (): Promise<MarketsPayload> => {
      const res = await fetch("/api/kalshi/markets", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load markets");
      const data = (await res.json()) as Partial<MarketsPayload>;
      return { markets: data.markets ?? [], events: data.events ?? [] };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/** Fixed display order of category sections on the Trending tab. */
export const CATEGORY_ORDER = PRIMARY_TABS.filter((t) => t !== "Trending");

const TRENDING_TAB_SIZE = 20;
const TRENDING_SECTION_SIZE = 6;

/** Live category → count map for the tab bar. Counts event cards shown. */
export function useCategoryCounts(): Record<string, number> {
  return useMarketStore(
    useShallow((s) => {
      const counts: Record<string, number> = {};
      for (const ticker of s.eventOrder) {
        const ev = s.events[ticker];
        if (!ev) continue;
        counts[ev.category] = (counts[ev.category] ?? 0) + 1;
      }
      return counts;
    }),
  );
}

/**
 * Subcategories for the left sidebar. Shows the full Kalshi list for categories
 * that define one (e.g. Economics → Fed, GDP, …), merged with any extras
 * discovered in live data.
 */
export function useSubcategoriesForCategory(category: string): string[] {
  const subKey = useMarketStore(
    useShallow((s) =>
      s.eventOrder.map((t) => {
        const ev = s.events[t];
        if (!ev || ev.category !== category || !ev.subCategory) return "";
        return ev.subCategory;
      }),
    ),
  );

  return useMemo(() => {
    const found = new Set<string>();
    for (const sub of subKey) {
      if (sub) found.add(sub);
    }
    const preferred = SUBCATEGORY_ORDER[category] ?? [];
    const merged = [...new Set([...preferred, ...found])];
    return sortSubcategories(category, merged);
  }, [category, subKey]);
}

/** Categories that always get a left sidebar (Kalshi defines sub-tabs for them). */
export function categoryHasSubcategorySidebar(category: string): boolean {
  if (TABS_WITHOUT_SIDEBAR.has(category)) return false;
  return (SUBCATEGORY_ORDER[category]?.length ?? 0) > 0;
}

// ─── Event-level grouping (one card per Kalshi event) ─────────────────────────

export type EventSection = {
  category: string;
  eventTickers: string[];
  /** Hide section header when browsing a single primary category. */
  flat?: boolean;
};

export type GroupedEvents = {
  /** Leader market of the highest 24h-volume event — the featured strip. */
  featured: string | null;
  sections: EventSection[];
};

function sortEventTickers(
  tickers: string[],
  events: Record<string, DashboardEvent>,
  order: SortOrder,
): string[] {
  const arr = [...tickers];
  switch (order) {
    case "volume":
      return arr.sort((a, b) => events[b].totalVolume - events[a].totalVolume);
    case "expiry":
      return arr.sort(
        (a, b) =>
          new Date(events[a].closeTime || 8.64e15).getTime() -
          new Date(events[b].closeTime || 8.64e15).getTime(),
      );
    case "movement":
      return arr.sort((a, b) => events[b].volume24h - events[a].volume24h);
    case "newest":
      return arr.reverse();
  }
}

/**
 * Sports ordering, Kalshi-style: live games first, then everything by start
 * time — soonest next. Ascending close time gives exactly that (live games
 * close soonest); long-dated futures (e.g. tournament winner) land last.
 */
function effectiveOrder(category: string, order: SortOrder): SortOrder {
  return category === "Sports" && order === "volume" ? "expiry" : order;
}

function topEventsBy24h(
  tickers: string[],
  events: Record<string, DashboardEvent>,
  count: number,
): string[] {
  return [...tickers]
    .sort(
      (a, b) =>
        (events[b].volume24h || events[b].totalVolume) -
        (events[a].volume24h || events[a].totalVolume),
    )
    .slice(0, count);
}

function eventSubCategory(ev: DashboardEvent): string | undefined {
  return ev.subCategory;
}

/**
 * Events grouped into Kalshi-style category sections — one card per event.
 * Trending shows a Trending section then every category; a specific primary
 * category shows a flat filtered grid.
 */
export function useGroupedEvents(): GroupedEvents {
  const activeCategory = useUiStore((s) => s.activeCategory);
  const sortOrder = useUiStore((s) => s.sortOrder);
  const eventSearch = useUiStore((s) => s.eventSearch);
  const subCategoryFilter = useUiStore((s) => s.subCategoryFilter);

  const eventCategoryKey = useMarketStore(
    useShallow((s) =>
      s.eventOrder.map(
        (t) =>
          `${t}:${s.events[t]?.category}:${s.events[t]?.subCategory ?? ""}`,
      ),
    ),
  );

  return useMemo(() => {
    const { events, eventOrder } = useMarketStore.getState();
    const all = eventOrder.filter((t) => events[t]);
    if (all.length === 0) return { featured: null, sections: [] };

    const q = eventSearch.trim().toLowerCase();
    if (q) {
      const matches = all.filter((t) => {
        const ev = events[t];
        return (
          ev.title.toLowerCase().includes(q) ||
          ev.outcomes.some((o) => o.name.toLowerCase().includes(q))
        );
      });
      return {
        featured: null,
        sections: [
          {
            category: "Results",
            eventTickers: sortEventTickers(matches, events, "volume"),
            flat: true,
          },
        ],
      };
    }

    const topEvent = topEventsBy24h(all, events, 1)[0];
    const featured = topEvent ? events[topEvent].leaderTicker : null;

    const sections: EventSection[] = [];

    if (activeCategory === "Trending") {
      sections.push({
        category: "Trending",
        eventTickers: topEventsBy24h(all, events, TRENDING_TAB_SIZE),
      });
      for (const category of CATEGORY_ORDER) {
        const tickers = all.filter((t) => events[t].category === category);
        if (tickers.length === 0) continue;
        sections.push({
          category,
          eventTickers: sortEventTickers(
            tickers,
            events,
            effectiveOrder(category, sortOrder),
          ),
        });
      }
      return { featured, sections };
    }

    let tickers = all.filter((t) => events[t].category === activeCategory);
    if (subCategoryFilter !== "All Markets") {
      tickers = tickers.filter(
        (t) => eventSubCategory(events[t]) === subCategoryFilter,
      );
    }

    const sectionTitle =
      subCategoryFilter !== "All Markets" ? subCategoryFilter : activeCategory;

    sections.push({
      category: sectionTitle,
      eventTickers: sortEventTickers(
        tickers,
        events,
        effectiveOrder(activeCategory, sortOrder),
      ),
      flat: true,
    });

    return { featured: null, sections };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeCategory,
    sortOrder,
    eventSearch,
    subCategoryFilter,
    eventCategoryKey,
  ]);
}

/** Page heading derived from active primary + subcategory selection. */
export function useMarketsHeading(): string {
  const activeCategory = useUiStore((s) => s.activeCategory);
  const subCategoryFilter = useUiStore((s) => s.subCategoryFilter);

  if (activeCategory === "Trending") return "Trending";
  if (subCategoryFilter !== "All Markets") return subCategoryFilter;
  return activeCategory;
}
