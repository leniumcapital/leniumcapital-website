"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useMarketStore } from "@/stores/marketStore";
import { useUiStore } from "@/stores/uiStore";
import {
  buildHeroEventTickers,
  filterEventsBySidebar,
  groupEventsBySeries,
  isPrimaryMarket,
  priceChange24h,
  type CompactListItem,
  type SeriesSection,
  COMPACT_LIST_SIZE,
} from "@/lib/trendingLayout";
import { isEventStillActive } from "@/lib/marketSync";

function activeEventTickers(
  eventOrder: string[],
  events: Record<string, import("@/lib/marketDetail").DashboardEvent>,
): string[] {
  return eventOrder.filter((t) => {
    const ev = events[t];
    return ev && isEventStillActive(ev);
  });
}

function filteredPool(
  eventOrder: string[],
  events: Record<string, import("@/lib/marketDetail").DashboardEvent>,
  sidebarFilter: string | null,
): string[] {
  return filterEventsBySidebar(
    activeEventTickers(eventOrder, events),
    events,
    sidebarFilter,
  );
}

function compactFromTickers(
  tickers: string[],
  markets: ReturnType<typeof useMarketStore.getState>["markets"],
  events: ReturnType<typeof useMarketStore.getState>["events"],
  mapRow: (
    eventTicker: string,
    ev: NonNullable<(typeof events)[string]>,
    rank: number,
  ) => CompactListItem,
): CompactListItem[] {
  return tickers.map((eventTicker, i) => {
    const ev = events[eventTicker];
    return mapRow(eventTicker, ev, i + 1);
  });
}

export function useTrendingSeriesSections(): SeriesSection[] {
  const activeSidebarFilter = useUiStore((s) => s.activeSidebarFilter);
  const eventKey = useMarketStore(
    useShallow((s) =>
      s.eventOrder.map(
        (t) =>
          `${t}:${s.events[t]?.seriesTicker}:${s.events[t]?.volume24h}:${s.events[t]?.totalVolume}`,
      ),
    ),
  );
  const catalogKey = useMarketStore((s) => s.catalogSyncedAt);

  return useMemo(() => {
    const { events, eventOrder } = useMarketStore.getState();
    const tickers = filteredPool(eventOrder, events, activeSidebarFilter);
    return groupEventsBySeries(tickers, events);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventKey, activeSidebarFilter, catalogKey]);
}

export function useHeroCarouselEvents(): string[] {
  const activeSidebarFilter = useUiStore((s) => s.activeSidebarFilter);
  const catalogKey = useMarketStore((s) => s.catalogSyncedAt);
  const eventKey = useMarketStore(
    useShallow((s) => s.eventOrder.length),
  );

  return useMemo(() => {
    const { events, eventOrder } = useMarketStore.getState();
    return buildHeroEventTickers(events, eventOrder, activeSidebarFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventKey, activeSidebarFilter, catalogKey]);
}

export function useSidebarTrending(): CompactListItem[] {
  const activeSidebarFilter = useUiStore((s) => s.activeSidebarFilter);
  const key = useMarketStore(
    useShallow((s) => `${s.catalogSyncedAt}:${s.lastBatchAt}:${activeSidebarFilter}`),
  );
  const heroKey = useHeroCarouselEvents();

  return useMemo(() => {
    const { events, eventOrder, markets } = useMarketStore.getState();
    const heroSet = new Set(heroKey);
    const pool = filteredPool(eventOrder, events, activeSidebarFilter).filter(
      (t) => !heroSet.has(t),
    );
    const sorted = pool.slice(0, COMPACT_LIST_SIZE);
    return compactFromTickers(sorted, markets, events, (eventTicker, ev, rank) => {
      const m = markets[ev.leaderTicker];
      const change = priceChange24h(m);
      return {
        rank,
        eventTicker,
        leaderTicker: ev.leaderTicker,
        title: ev.title,
        subtitle: ev.subCategory ?? ev.category,
        probability: m?.yesPrice ?? ev.outcomes[0]?.yesPrice ?? 0,
        change: change ?? undefined,
      };
    });
  }, [key, heroKey, activeSidebarFilter]);
}

export function useSidebarPrimaries(): CompactListItem[] {
  const activeSidebarFilter = useUiStore((s) => s.activeSidebarFilter);
  const key = useMarketStore(
    useShallow((s) => `${s.catalogSyncedAt}:${s.lastBatchAt}:${activeSidebarFilter}`),
  );

  return useMemo(() => {
    const { events, eventOrder, markets } = useMarketStore.getState();
    const filtered = filteredPool(eventOrder, events, activeSidebarFilter)
      .filter((t) => {
        const ev = events[t];
        return ev && isPrimaryMarket(ev);
      })
      .sort((a, b) => events[b].totalVolume - events[a].totalVolume)
      .slice(0, COMPACT_LIST_SIZE);

    if (filtered.length === 0) return [];

    return compactFromTickers(filtered, markets, events, (eventTicker, ev, rank) => {
      const m = markets[ev.leaderTicker];
      return {
        rank,
        eventTicker,
        leaderTicker: ev.leaderTicker,
        title: ev.title,
        subtitle: ev.subCategory ?? "Primary",
        probability: m?.yesPrice ?? ev.outcomes[0]?.yesPrice ?? 0,
      };
    });
  }, [key, activeSidebarFilter]);
}

export function useSidebarMovers(): CompactListItem[] {
  const activeSidebarFilter = useUiStore((s) => s.activeSidebarFilter);
  const key = useMarketStore(
    useShallow((s) => `${s.catalogSyncedAt}:${s.lastBatchAt}:${activeSidebarFilter}`),
  );

  return useMemo(() => {
    const { events, eventOrder, markets } = useMarketStore.getState();
    const ranked = filteredPool(eventOrder, events, activeSidebarFilter)
      .map((eventTicker) => {
        const ev = events[eventTicker];
        const m = markets[ev.leaderTicker];
        const change = priceChange24h(m);
        return {
          eventTicker,
          ev,
          change: change ?? 0,
          abs: Math.abs(change ?? 0),
        };
      })
      .filter((x) => x.abs > 0)
      .sort((a, b) => b.abs - a.abs)
      .slice(0, COMPACT_LIST_SIZE);

    return ranked.map((row, i) => ({
      rank: i + 1,
      eventTicker: row.eventTicker,
      leaderTicker: row.ev.leaderTicker,
      title: row.ev.title,
      subtitle: row.ev.subCategory ?? row.ev.category,
      probability: markets[row.ev.leaderTicker]?.yesPrice ?? 0,
      change: row.change,
    }));
  }, [key, activeSidebarFilter]);
}

export function useSidebarNew(): CompactListItem[] {
  const activeSidebarFilter = useUiStore((s) => s.activeSidebarFilter);
  const key = useMarketStore(
    useShallow(
      (s) =>
        `${s.catalogSyncedAt}:${Object.keys(s.eventFirstSeenAt).length}:${activeSidebarFilter}`,
    ),
  );

  return useMemo(() => {
    const { events, eventOrder, markets, eventFirstSeenAt } =
      useMarketStore.getState();
    const recent = filteredPool(eventOrder, events, activeSidebarFilter)
      .sort(
        (a, b) =>
          (eventFirstSeenAt[b] ?? 0) - (eventFirstSeenAt[a] ?? 0),
      )
      .slice(0, COMPACT_LIST_SIZE);
    return compactFromTickers(recent, markets, events, (eventTicker, ev, rank) => ({
      rank,
      eventTicker,
      leaderTicker: ev.leaderTicker,
      title: ev.title,
      subtitle: ev.subCategory ?? ev.category,
      probability: markets[ev.leaderTicker]?.yesPrice ?? ev.outcomes[0]?.yesPrice ?? 0,
    }));
  }, [key, activeSidebarFilter]);
}

export function useSidebarHighestVolume(): CompactListItem[] {
  const activeSidebarFilter = useUiStore((s) => s.activeSidebarFilter);
  const key = useMarketStore(
    useShallow((s) => `${s.catalogSyncedAt}:${s.lastBatchAt}:${activeSidebarFilter}`),
  );

  return useMemo(() => {
    const { events, eventOrder, markets } = useMarketStore.getState();
    const sorted = filteredPool(eventOrder, events, activeSidebarFilter)
      .sort((a, b) => events[b].totalVolume - events[a].totalVolume)
      .slice(0, COMPACT_LIST_SIZE);

    return compactFromTickers(sorted, markets, events, (eventTicker, ev, rank) => {
      const m = markets[ev.leaderTicker];
      return {
        rank,
        eventTicker,
        leaderTicker: ev.leaderTicker,
        title: ev.title,
        subtitle: `${formatVol(ev.totalVolume)} · ${ev.marketCount} market${ev.marketCount === 1 ? "" : "s"}`,
        probability: m?.yesPrice ?? ev.outcomes[0]?.yesPrice ?? 0,
      };
    });
  }, [key, activeSidebarFilter]);
}

function formatVol(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${Math.round(usd)}`;
}
