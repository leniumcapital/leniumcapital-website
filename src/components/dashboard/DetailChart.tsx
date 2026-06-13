"use client";

import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ResponsiveContainer } from "recharts";
import type { MarketOutcome, ChartRange } from "@/lib/marketDetail";
import { OutcomeAvatar } from "@/components/dashboard/KalshiImages";
import {
  fetchMarketHistoryClient,
  marketHistoryQueryKey,
} from "@/lib/clientApi";
import { T } from "@/lib/tokens";

/** Exact line color order for multi-outcome charts. */
export const OUTCOME_COLORS = [
  "#00E87A",
  "#3B82F6",
  "#F59E0B",
  "#EF4444",
  "#A855F7",
  "#06B6D4",
] as const;

const RANGES: ChartRange[] = ["1D", "1W", "1M", "ALL"];

const CHART_HEIGHT = 320;
// Approximate Recharts plot box (margins + x-axis) used to position the
// current-price annotation at the right edge.
const PLOT_TOP = 10;
const PLOT_BOTTOM = 30;

interface DetailChartProps {
  ticker: string;
  category: string;
  /** Outcomes charted as multiple lines when there is more than one. */
  outcomes: MarketOutcome[];
  currentPrice: number;
  /** YES price 24h ago (0 = unknown). Drives line color + change pill. */
  prevPrice: number;
}

function formatTick(ts: number, range: ChartRange): string {
  const d = new Date(ts);
  if (range === "1D") {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTooltipTs(ts: number): string {
  const d = new Date(ts);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export function DetailChart({
  ticker,
  category,
  outcomes,
  currentPrice,
  prevPrice,
}: DetailChartProps) {
  const [range, setRange] = useState<ChartRange>("1D");
  const isMulti = outcomes.length > 1;
  const chartedOutcomes = useMemo(
    () => (isMulti ? outcomes.slice(0, OUTCOME_COLORS.length) : []),
    [isMulti, outcomes],
  );

  // ── Single-outcome history ──────────────────────────────────────────────────
  const single = useQuery({
    queryKey: marketHistoryQueryKey(ticker, range),
    queryFn: () => fetchMarketHistoryClient(ticker, range),
    enabled: !isMulti,
    staleTime: 60_000,
  });

  // ── Multi-outcome: one series per outcome, merged on the time axis ─────────
  const multi = useQueries({
    queries: chartedOutcomes.map((o) => ({
      queryKey: marketHistoryQueryKey(o.ticker, range),
      queryFn: () => fetchMarketHistoryClient(o.ticker, range),
      staleTime: 60_000,
    })),
  });

  const data = useMemo(() => {
    if (!isMulti) {
      return (single.data ?? []).map((p) => ({ ts: p.t, [ticker]: p.p }));
    }
    const byTs = new Map<number, Record<string, number>>();
    chartedOutcomes.forEach((o, i) => {
      for (const p of multi[i]?.data ?? []) {
        const row = byTs.get(p.t) ?? {};
        row[o.ticker] = p.p;
        byTs.set(p.t, row);
      }
    });
    return Array.from(byTs.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([ts, row]) => ({ ts, ...row }));
  }, [isMulti, single.data, multi, chartedOutcomes, ticker]);

  const loading = isMulti
    ? multi.some((q) => q.isPending)
    : single.isPending;

  const up = prevPrice > 0 ? currentPrice >= prevPrice : true;
  const lineColor = up ? T.green : "#FFFFFF";
  const change = prevPrice > 0 ? currentPrice - prevPrice : 0;

  const nameFor = (key: string) =>
    chartedOutcomes.find((o) => o.ticker === key)?.name ?? "YES";
  const colorFor = (key: string) => {
    const i = chartedOutcomes.findIndex((o) => o.ticker === key);
    return i >= 0 ? OUTCOME_COLORS[i] : lineColor;
  };

  // Map the current price to a pixel y position inside the plot box.
  const plotHeight = CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
  const annotationY = PLOT_TOP + (1 - currentPrice / 100) * plotHeight;

  return (
    <div style={{ marginTop: 24, fontFamily: T.font }}>
      {isMulti && chartedOutcomes.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 10,
          }}
        >
          {chartedOutcomes.map((o, i) => (
            <div
              key={o.ticker}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <OutcomeAvatar
                ticker={o.ticker}
                name={o.name}
                category={category}
                imageUrl={o.imageUrl}
                size={20}
                color={OUTCOME_COLORS[i]}
                colorIndex={i}
              />
              <span style={{ color: T.textSecondary, fontSize: 12 }}>
                {o.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Range selector */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
        {RANGES.map((r) => {
          const active = r === range;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              style={{
                height: 28,
                padding: "0 10px",
                fontSize: 12,
                borderRadius: 4,
                cursor: "pointer",
                background: active ? T.bgTertiary : "transparent",
                border: active ? T.hairline() : "0.5px solid transparent",
                color: active ? T.textPrimary : T.textMuted,
                transition: `color ${T.transition}`,
                fontFamily: T.font,
              }}
            >
              {r}
            </button>
          );
        })}
      </div>

      <div style={{ position: "relative", width: "100%", height: CHART_HEIGHT }}>
        {loading || data.length < 2 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.textMuted,
              fontSize: 12,
            }}
          >
            {loading ? (
              <span
                className="lenium-skeleton"
                style={{ width: "100%", height: "85%", borderRadius: 8 }}
              />
            ) : (
              "No price history available for this range"
            )}
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <ComposedChart
                data={data}
                margin={{ top: PLOT_TOP, right: 4, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id={`detail-fill-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={up ? "rgba(0,232,122,0.15)" : "rgba(255,255,255,0.08)"}
                    />
                    <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="ts"
                  tickFormatter={(ts: number) => formatTick(ts, range)}
                  tick={{ fill: T.textMuted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={56}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fill: T.textMuted, fontSize: 11 }}
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  cursor={{ stroke: T.borderHover, strokeWidth: 0.5 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div
                        style={{
                          background: T.bgTertiary,
                          border: T.hairline(T.borderHover),
                          borderRadius: 8,
                          padding: "10px 14px",
                          fontFamily: T.font,
                        }}
                      >
                        <div style={{ color: T.textSecondary, fontSize: 11, marginBottom: 6 }}>
                          {formatTooltipTs(Number(label))}
                        </div>
                        {payload.map((entry) => {
                          const key = String(entry.dataKey);
                          const outcome = chartedOutcomes.find(
                            (o) => o.ticker === key,
                          );
                          const idx = chartedOutcomes.findIndex(
                            (o) => o.ticker === key,
                          );
                          return (
                            <div
                              key={key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 12,
                                color: T.textPrimary,
                                marginTop: 2,
                              }}
                            >
                              {outcome ? (
                                <OutcomeAvatar
                                  ticker={outcome.ticker}
                                  name={outcome.name}
                                  category={category}
                                  imageUrl={outcome.imageUrl}
                                  size={18}
                                  color={
                                    idx >= 0 ? OUTCOME_COLORS[idx] : undefined
                                  }
                                  colorIndex={idx >= 0 ? idx : undefined}
                                />
                              ) : (
                                <span
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: colorFor(key),
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              <span style={{ color: T.textSecondary }}>
                                {nameFor(key)}
                              </span>
                              <span style={{ fontWeight: 600 }}>
                                {entry.value}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                {isMulti ? (
                  chartedOutcomes.map((o, i) => (
                    <Line
                      key={o.ticker}
                      type="monotone"
                      dataKey={o.ticker}
                      stroke={OUTCOME_COLORS[i]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  ))
                ) : (
                  <>
                    <Area
                      type="monotone"
                      dataKey={ticker}
                      stroke="none"
                      fill={`url(#detail-fill-${ticker})`}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey={ticker}
                      stroke={lineColor}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>

            {/* 24h change annotation pinned to the right edge at price level */}
            {!isMulti && change !== 0 && (
              <div
                style={{
                  position: "absolute",
                  right: 44,
                  top: Math.max(0, Math.min(CHART_HEIGHT - 22, annotationY - 11)),
                  background: change >= 0 ? "rgba(0,232,122,0.15)" : T.redMuted,
                  border: T.hairline(change >= 0 ? T.greenMutedBorder : "#3A1A1A"),
                  color: change >= 0 ? T.green : T.red,
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  pointerEvents: "none",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {change >= 0 ? "+" : "−"}
                {Math.abs(change)}¢
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
