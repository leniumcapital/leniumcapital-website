"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMarketStore } from "@/stores/marketStore";
import { T } from "@/lib/tokens";

export type TimeRange = "1H" | "6H" | "1D" | "1W" | "ALL";

interface PriceChartProps {
  ticker: string;
  range: TimeRange;
}

type Point = { t: number; p: number };

function formatTooltipTime(t: number): string {
  const d = new Date(t);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} at ${time}`;
}

function formatAxisTime(t: number, range: TimeRange): string {
  const d = new Date(t);
  if (range === "1H" || range === "6H") {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (range === "1D") {
    return d.toLocaleTimeString("en-US", { hour: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Area chart of YES price history for the trading drawer. */
export function PriceChart({ ticker, range }: PriceChartProps) {
  const { data: serverPoints } = useQuery({
    queryKey: ["market-history", ticker, range],
    queryFn: async (): Promise<Point[]> => {
      const res = await fetch(
        `/api/kalshi/history/${encodeURIComponent(ticker)}?range=${range}`,
        { cache: "no-store" },
      );
      if (!res.ok) return [];
      const data = (await res.json()) as { points?: Point[] };
      return data.points ?? [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Live in-session history as fallback while candlesticks load (or if empty).
  const liveHistory = useMarketStore((s) => s.markets[ticker]?.priceHistory);

  const points = useMemo(() => {
    if (serverPoints && serverPoints.length >= 2) return serverPoints;
    return liveHistory ?? [];
  }, [serverPoints, liveHistory]);

  if (points.length < 2) {
    return (
      <div
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: T.textMuted,
          fontSize: 12,
        }}
      >
        Collecting price history…
      </div>
    );
  }

  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id={`fill-${ticker}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,232,122,0.15)" />
              <stop offset="100%" stopColor="rgba(0,232,122,0)" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={T.border} strokeWidth={0.5} vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(t: number) => formatAxisTime(t, range)}
            tick={{ fill: T.textMuted, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            minTickGap={48}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fill: T.textMuted, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as Point;
              return (
                <div
                  style={{
                    background: T.bgTertiary,
                    border: T.hairline(),
                    borderRadius: 6,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontFamily: T.font,
                  }}
                >
                  <div style={{ color: T.textPrimary, fontWeight: 500 }}>
                    {point.p}%
                  </div>
                  <div style={{ color: T.textMuted, fontSize: 11 }}>
                    {formatTooltipTime(point.t)}
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="p"
            stroke={T.green}
            strokeWidth={1.5}
            fill={`url(#fill-${ticker})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
