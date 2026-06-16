"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useQueries } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { useMarketStore } from "@/stores/marketStore";
import { useUiStore } from "@/stores/uiStore";
import { useMinuteNow } from "@/hooks/useChallengeProgress";
import { useHeroCarouselEvents } from "@/hooks/useTrendingLayout";
import MarketOutcomeAvatar from "@/components/dashboard/MarketOutcomeAvatar";
import { HeroPriceChartLazy } from "@/components/dashboard/trending/HeroPriceChartLazy";
import {
  fetchMarketHistoryClient,
  marketHistoryQueryKey,
} from "@/lib/clientApi";
import {
  formatCloseLabel,
  formatVolShort,
  isEventLive,
} from "@/lib/trendingLayout";
import { compactUsd } from "@/lib/data";
import { T } from "@/lib/tokens";

const AUTO_MS = 8000;

export function TrendingHeroCard() {
  const heroEvents = useHeroCarouselEvents();
  const index = useUiStore((s) => s.heroCarouselIndex);
  const setIndex = useUiStore((s) => s.setHeroCarouselIndex);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const safeIndex =
    heroEvents.length > 0
      ? Math.min(index, heroEvents.length - 1)
      : 0;

  useEffect(() => {
    if (heroEvents.length > 0 && index >= heroEvents.length) {
      setIndex(0);
    }
  }, [heroEvents.length, index, setIndex]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (heroEvents.length <= 1) return;
    timerRef.current = setInterval(() => {
      const cur = useUiStore.getState().heroCarouselIndex;
      setIndex((cur + 1) % heroEvents.length);
    }, AUTO_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [heroEvents.length, setIndex]);

  const go = (delta: number) => {
    if (heroEvents.length === 0) return;
    const next = (safeIndex + delta + heroEvents.length) % heroEvents.length;
    setIndex(next);
  };

  if (heroEvents.length === 0) return null;

  const eventTicker = heroEvents[safeIndex] ?? heroEvents[0];

  return (
    <div style={{ marginBottom: 24, fontFamily: T.font }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={eventTicker}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.2, ease: "easeOut" } }}
          exit={{ opacity: 0, x: -20, transition: { duration: 0.12 } }}
          style={{
            background: T.bgSecondary,
            border: T.hairline(),
            borderRadius: T.radiusLg,
            padding: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <HeroCategoryBadge eventTicker={eventTicker} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <NavCircle onClick={() => go(-1)} aria-label="Previous">
                <IconChevronLeft size={14} stroke={1.5} />
              </NavCircle>
              <span
                style={{
                  color: T.textMuted,
                  fontSize: 13,
                  minWidth: 48,
                  textAlign: "center",
                }}
              >
                {safeIndex + 1} of {heroEvents.length}
              </span>
              <NavCircle onClick={() => go(1)} aria-label="Next">
                <IconChevronRight size={14} stroke={1.5} />
              </NavCircle>
            </div>
          </div>
          <HeroSlide eventTicker={eventTicker} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function HeroCategoryBadge({ eventTicker }: { eventTicker: string }) {
  const category = useMarketStore(
    (s) => s.events[eventTicker]?.category ?? "Trending",
  );
  return (
    <span
      style={{
        background: T.greenMutedBg,
        border: `0.5px solid ${T.greenMutedBorder}`,
        color: T.green,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "3px 10px",
        borderRadius: 4,
      }}
    >
      {category}
    </span>
  );
}

function NavCircle({
  children,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  "aria-label": string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      {...rest}
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: T.bgTertiary,
        border: T.hairline(),
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        color: hover ? T.textPrimary : T.textSecondary,
        transition: `color ${T.transition}`,
      }}
    >
      {children}
    </button>
  );
}

function HeroSlide({ eventTicker }: { eventTicker: string }) {
  const router = useRouter();
  const now = useMinuteNow();
  const event = useMarketStore(useShallow((s) => s.events[eventTicker] ?? null));

  const outcomeTickers = event?.outcomes.map((o) => o.ticker) ?? [];
  const historyQueries = useQueries({
    queries: outcomeTickers.map((ticker) => ({
      queryKey: marketHistoryQueryKey(ticker, "1D"),
      queryFn: () => fetchMarketHistoryClient(ticker, "1D"),
      staleTime: 60_000,
      enabled: Boolean(ticker),
    })),
  });

  const histories: Record<string, { t: number; p: number }[]> = {};
  outcomeTickers.forEach((ticker, i) => {
    histories[ticker] = historyQueries[i]?.data ?? [];
  });

  if (!event) return null;

  const live = isEventLive(event.closeTime, now);
  const maxProb = Math.max(...event.outcomes.map((o) => o.yesPrice), 1);

  return (
    <div
      onClick={() =>
        router.push(`/dashboard/markets/${encodeURIComponent(event.leaderTicker)}`)
      }
      style={{ cursor: "pointer" }}
    >
      <h2
        style={{
          margin: "12px 0 4px",
          color: T.textPrimary,
          fontSize: 22,
          fontWeight: 500,
          lineHeight: 1.3,
        }}
      >
        {event.title}
      </h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: T.textMuted,
          fontSize: 13,
          marginBottom: 20,
        }}
      >
        {live && (
          <>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: T.red,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            <span style={{ color: T.red, fontSize: 11, fontWeight: 600 }}>LIVE</span>
          </>
        )}
        <span>{formatCloseLabel(event.closeTime, now)}</span>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
        <div style={{ flex: "0 0 55%", minWidth: 0 }}>
          {event.outcomes.map((outcome, i) => (
            <HeroOutcomeRow
              key={outcome.ticker}
              outcome={outcome}
              category={event.category}
              seriesTicker={event.seriesTicker}
              eventTitle={event.title}
              isLeader={outcome.yesPrice >= maxProb - 0.5}
              showBar={i < 6}
            />
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 12,
              color: T.textMuted,
              fontSize: 12,
            }}
          >
            <span>{formatVolShort(event.totalVolume)} vol</span>
            <span>
              {event.marketCount} market{event.marketCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div style={{ flex: "0 0 45%", minWidth: 0 }}>
          <HeroPriceChartLazy
            outcomes={event.outcomes}
            histories={histories}
            height={180}
          />
        </div>
      </div>

      <div
        style={{
          borderTop: T.hairline(),
          marginTop: 20,
          paddingTop: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            color: T.green,
            fontSize: 11,
            fontWeight: 600,
            minWidth: 48,
            flexShrink: 0,
          }}
        >
          News
        </span>
        <span
          style={{
            flex: 1,
            color: T.textSecondary,
            fontSize: 13,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Markets pricing {compactUsd(event.totalVolume)} in volume on {event.title}
        </span>
        <span style={{ color: T.textMuted, fontSize: 13, flexShrink: 0 }}>Read more</span>
      </div>
    </div>
  );
}

function HeroOutcomeRow({
  outcome,
  category,
  seriesTicker,
  eventTitle,
  isLeader,
}: {
  outcome: { ticker: string; name: string; yesPrice: number; imageUrl?: string };
  category: string;
  seriesTicker?: string;
  eventTitle?: string;
  isLeader: boolean;
  showBar: boolean;
}) {
  const livePrice = useMarketStore(
    (s) => s.markets[outcome.ticker]?.yesPrice ?? outcome.yesPrice,
  );
  const [flash, setFlash] = useState<string | null>(null);
  const prev = useRef(livePrice);

  useEffect(() => {
    if (prev.current !== livePrice) {
      setFlash(livePrice > prev.current ? T.green : T.red);
      prev.current = livePrice;
      const t = setTimeout(() => setFlash(null), 600);
      return () => clearTimeout(t);
    }
  }, [livePrice]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 44,
        borderBottom: T.hairline(),
      }}
    >
      <MarketOutcomeAvatar
        name={outcome.name}
        category={category}
        directUrl={outcome.imageUrl ?? null}
        marketTicker={outcome.ticker}
        seriesTicker={seriesTicker}
        eventTitle={eventTitle}
        size={28}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: T.textPrimary, fontSize: 14 }}>{outcome.name}</div>
        <div
          style={{
            marginTop: 4,
            width: 80,
            height: 2,
            background: T.border,
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.min(100, livePrice)}%`,
              height: "100%",
              background: isLeader ? T.green : T.textMuted,
            }}
          />
        </div>
      </div>
      <motion.span
        animate={{ color: flash ?? T.textPrimary }}
        transition={{ duration: flash ? 0.05 : 0.5 }}
        style={{
          background: T.bgTertiary,
          border: T.hairline(T.borderHover),
          borderRadius: 6,
          padding: "4px 12px",
          fontSize: 14,
          fontWeight: 600,
          minWidth: 52,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {livePrice}%
      </motion.span>
    </div>
  );
}
