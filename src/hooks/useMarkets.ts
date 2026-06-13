"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { useMarketStore, type Market } from "@/stores/marketStore";
import { useUiStore, type SortOrder } from "@/stores/uiStore";
import type { DashboardEvent } from "@/lib/marketDetail";

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

/** Fixed display order of category sections, mirroring Kalshi. */
export const CATEGORY_ORDER = [
  "Economics",
  "Politics",
  "Sports",
  "Crypto",
  "Culture",
  "Climate",
  "Science and Tech",
  "Health",
] as const;

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

// ─── Event-level grouping (one card per Kalshi event) ─────────────────────────

export type EventSection = {
  category: string;
  eventTickers: string[];
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

/** Curated sport display order, mirroring Kalshi's sports sidebar. */
const SPORT_ORDER = [
  "World Cup",
  "Soccer",
  "Basketball",
  "Football",
  "Baseball",
  "Hockey",
  "Tennis",
  "Golf",
  "MMA",
  "Boxing",
  "Motorsports",
  "Cricket",
  "Esports",
  "Olympics",
  "More Sports",
];

/** Sports present in the live data, with event counts, in curated order. */
export function useSportsSubcategories(): { name: string; count: number }[] {
  // Subscribe to primitives only — useShallow on fresh objects re-renders
  // forever (the store updates every 250ms).
  const sportsKey = useMarketStore(
    useShallow((s) =>
      s.eventOrder.map((t) => {
        const ev = s.events[t];
        return ev?.category === "Sports" ? (ev.subCategory ?? "More Sports") : "";
      }),
    ),
  );
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const sport of sportsKey) {
      if (!sport) continue;
      counts.set(sport, (counts.get(sport) ?? 0) + 1);
    }
    return SPORT_ORDER.filter((name) => counts.has(name)).map((name) => ({
      name,
      count: counts.get(name) ?? 0,
    }));
  }, [sportsKey]);
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

/**
 * Events grouped into Kalshi-style category sections — one card per event.
 * "All Markets"/"Trending" show a Trending section then every category;
 * a specific category shows only its own section.
 */
export function useGroupedEvents(): GroupedEvents {
  const activeCategory = useUiStore((s) => s.activeCategory);
  const sortOrder = useUiStore((s) => s.sortOrder);
  const eventSearch = useUiStore((s) => s.eventSearch);
  const sportsFilter = useUiStore((s) => s.sportsFilter);

  const eventCategoryKey = useMarketStore(
    useShallow((s) => s.eventOrder.map((t) => `${t}:${s.events[t]?.category}`)),
  );

  return useMemo(() => {
    const { events, eventOrder } = useMarketStore.getState();
    const all = eventOrder.filter((t) => events[t]);
    if (all.length === 0) return { featured: null, sections: [] };

    // Page-level search overrides category grouping entirely.
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
          },
        ],
      };
    }

    const topEvent = topEventsBy24h(all, events, 1)[0];
    const featured = topEvent ? events[topEvent].leaderTicker : null;
    const showAll =
      activeCategory === "All Markets" || activeCategory === "Trending";

    const sections: EventSection[] = [];

    if (showAll) {
      const trendingSize =
        activeCategory === "Trending" ? TRENDING_TAB_SIZE : TRENDING_SECTION_SIZE;
      sections.push({
        category: "Trending",
        eventTickers: topEventsBy24h(all, events, trendingSize),
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
    } else {
      let tickers = all.filter((t) => events[t].category === activeCategory);
      // Sports sub-menu: narrow to one sport when picked.
      if (activeCategory === "Sports" && sportsFilter !== "All") {
        tickers = tickers.filter(
          (t) => (events[t].subCategory ?? "More Sports") === sportsFilter,
        );
      }
      sections.push({
        category:
          activeCategory === "Sports" && sportsFilter !== "All"
            ? sportsFilter
            : activeCategory,
        eventTickers: sortEventTickers(
          tickers,
          events,
          effectiveOrder(activeCategory, sortOrder),
        ),
      });
    }

    return { featured, sections };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, sortOrder, eventSearch, sportsFilter, eventCategoryKey]);
}
