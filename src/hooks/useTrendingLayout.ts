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
    const tickers = filterEventsBySidebar(
      eventOrder.filter((t) => events[t]),
      events,
      activeSidebarFilter,
    );

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

function topEvents(count: number): CompactListItem[] {
  const { events, eventOrder, markets } = useMarketStore.getState();
  const sorted = eventOrder.filter((t) => events[t]).slice(0, count);

  return sorted.map((eventTicker, i) => {
    const ev = events[eventTicker];
    const m = markets[ev.leaderTicker];
    const change = priceChange24h(m);
    return {
      rank: i + 1,
      eventTicker,
      leaderTicker: ev.leaderTicker,
      title: ev.title,
      subtitle: ev.subCategory ?? ev.category,
      probability: m?.yesPrice ?? ev.outcomes[0]?.yesPrice ?? 0,
      change: change ?? undefined,
    };
  });
}

export function useSidebarTrending(): CompactListItem[] {
  const key = useMarketStore(
    useShallow((s) => `${s.catalogSyncedAt}:${s.lastBatchAt}`),
  );
  return useMemo(() => topEvents(COMPACT_LIST_SIZE), [key]);
}

export function useSidebarPrimaries(): CompactListItem[] {
  const key = useMarketStore(
    useShallow((s) => `${s.catalogSyncedAt}:${s.lastBatchAt}`),
  );
  return useMemo(() => {
    const { events, eventOrder, markets } = useMarketStore.getState();
    const filtered = eventOrder
      .filter((t) => {
        const ev = events[t];
        return ev && isPrimaryMarket(ev);
      })
      .sort((a, b) => events[b].totalVolume - events[a].totalVolume)
      .slice(0, COMPACT_LIST_SIZE);

    if (filtered.length === 0) return [];

    return filtered.map((eventTicker, i) => {
      const ev = events[eventTicker];
      const m = markets[ev.leaderTicker];
      return {
        rank: i + 1,
        eventTicker,
        leaderTicker: ev.leaderTicker,
        title: ev.title,
        subtitle: ev.subCategory ?? "Primary",
        probability: m?.yesPrice ?? ev.outcomes[0]?.yesPrice ?? 0,
      };
    });
  }, [key]);
}

export function useSidebarMovers(): CompactListItem[] {
  const key = useMarketStore(
    useShallow((s) => `${s.catalogSyncedAt}:${s.lastBatchAt}`),
  );
  return useMemo(() => {
    const { events, eventOrder, markets } = useMarketStore.getState();
    const ranked = [...eventOrder]
      .filter((t) => events[t])
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
  }, [key]);
}

export function useSidebarNew(): CompactListItem[] {
  const key = useMarketStore(
    useShallow((s) => `${s.catalogSyncedAt}:${Object.keys(s.eventFirstSeenAt).length}`),
  );
  return useMemo(() => {
    const { events, eventOrder, markets, eventFirstSeenAt } =
      useMarketStore.getState();
    const recent = [...eventOrder]
      .filter((t) => events[t])
      .sort(
        (a, b) =>
          (eventFirstSeenAt[b] ?? 0) - (eventFirstSeenAt[a] ?? 0),
      )
      .slice(0, COMPACT_LIST_SIZE);
    return recent.map((eventTicker, i) => {
      const ev = events[eventTicker];
      if (!ev) return null;
      return {
        rank: i + 1,
        eventTicker,
        leaderTicker: ev.leaderTicker,
        title: ev.title,
        subtitle: ev.subCategory ?? ev.category,
        probability: markets[ev.leaderTicker]?.yesPrice ?? ev.outcomes[0]?.yesPrice ?? 0,
      };
    }).filter(Boolean) as CompactListItem[];
  }, [key]);
}

export function useSidebarHighestVolume(): CompactListItem[] {
  const key = useMarketStore(
    useShallow((s) => `${s.catalogSyncedAt}:${s.lastBatchAt}`),
  );
  return useMemo(() => {
    const { events, eventOrder, markets } = useMarketStore.getState();
    const sorted = [...eventOrder]
      .filter((t) => events[t])
      .sort((a, b) => events[b].totalVolume - events[a].totalVolume)
      .slice(0, COMPACT_LIST_SIZE);

    return sorted.map((eventTicker, i) => {
      const ev = events[eventTicker];
      const m = markets[ev.leaderTicker];
      return {
        rank: i + 1,
        eventTicker,
        leaderTicker: ev.leaderTicker,
        title: ev.title,
        subtitle: `${formatVol(ev.totalVolume)} · ${ev.marketCount} market${ev.marketCount === 1 ? "" : "s"}`,
        probability: m?.yesPrice ?? ev.outcomes[0]?.yesPrice ?? 0,
      };
    });
  }, [key]);
}

function formatVol(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${Math.round(usd)}`;
}
