"use client";

import { useEffect, useRef, useState } from "react";
import { useMarketStore } from "@/stores/marketStore";
import { KalshiEventCard } from "@/components/dashboard/KalshiEventCard";

export function LazyTrendingCard({
  eventTicker,
  children,
}: {
  eventTicker: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible ? (
        children
      ) : (
        <div
          className="lenium-skeleton"
          style={{ height: 200, borderRadius: 12 }}
        />
      )}
    </div>
  );
}

export function TrendingSectionCard({ eventTicker }: { eventTicker: string }) {
  const event = useMarketStore((s) => s.events[eventTicker]);
  const [hovered, setHovered] = useState(false);

  if (!event || event.outcomes.length === 0) return null;

  return (
    <KalshiEventCard
      event={event}
      hovered={hovered}
      onHover={setHovered}
      maxOutcomes={2}
    />
  );
}

export function TrendingCardSkeleton() {
  return (
    <div
      className="lenium-skeleton"
      style={{ height: 200, borderRadius: 12 }}
    />
  );
}
