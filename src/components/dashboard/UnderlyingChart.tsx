"use client";

/**
 * Live price chart for the underlying financial instrument of a market
 * (Bitcoin spot, S&P 500, WTI crude, ...). Mirrors Kalshi: ladder markets
 * chart the real asset price — constantly updating — with the selected
 * strike drawn as a reference line, instead of contract probabilities.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { ChartRange } from "@/lib/marketDetail";
import type { UnderlyingAsset } from "@/lib/underlying";
import { fetchUnderlyingClient, underlyingQueryKey } from "@/lib/clientApi";
import { T } from "@/lib/tokens";

const RANGES: ChartRange[] = ["1D", "1W", "1M", "ALL"];
const CHART_HEIGHT = 320;

interface UnderlyingChartProps {
  asset: UnderlyingAsset;
  /** Strike level of the currently selected outcome, drawn as a dashed line. */
  strike?: { value: number; label: string } | null;
}

function fmtPrice(v: number, decimals: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtAxis(v: number, decimals: number): string {
  if (Math.abs(v) >= 10_000) {
    return `$${(v / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}K`;
  }
  return `$${fmtPrice(v, Math.min(decimals, 2))}`;
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

export function UnderlyingChart({ asset, strike }: UnderlyingChartProps) {
  const [range, setRange] = useState<ChartRange>("1D");

  const { data, isPending } = useQuery({
    queryKey: underlyingQueryKey(asset.symbol, range),
    queryFn: () => fetchUnderlyingClient(asset.symbol, range),
    // 1D is the "live" view — poll every 5s; longer ranges every minute.
    refetchInterval: range === "1D" ? 5_000 : 60_000,
    refetchIntervalInBackground: false,
    staleTime: 4_000,
    placeholderData: (prev) => prev, // keep the line while ranges swap
  });

  const points = useMemo(
    () => (data?.points ?? []).map((p) => ({ ts: p.t, price: p.p })),
    [data],
  );

  const spot = data?.spot ?? 0;
  const baseline =
    range === "1D" ? (data?.prevClose ?? 0) : (points[0]?.price ?? 0);
  const change = baseline > 0 ? spot - baseline : 0;
  const changePct = baseline > 0 ? (change / baseline) * 100 : 0;
  const up = change >= 0;
  const lineColor = up ? T.green : T.red;

  // Y domain: data extent padded 8%, widened to include the strike when it
  // is reasonably close (so far-away strikes don't flatten the chart).
  const [yMin, yMax] = useMemo(() => {
    if (points.length === 0) return [0, 1] as const;
    let min = Infinity;
    let max = -Infinity;
    for (const p of points) {
      if (p.price < min) min = p.price;
      if (p.price > max) max = p.price;
    }
    const span = Math.max(max - min, max * 0.001);
    if (
      strike &&
      strike.value > min - span * 2 &&
      strike.value < max + span * 2
    ) {
      min = Math.min(min, strike.value);
      max = Math.max(max, strike.value);
    }
    const pad = (max - min) * 0.08 || max * 0.001;
    return [min - pad, max + pad] as const;
  }, [points, strike]);

  const strikeVisible =
    strike != null && strike.value > yMin && strike.value < yMax;

  return (
    <div style={{ marginTop: 24, fontFamily: T.font }}>
      {/* Header: live spot price + change, range selector */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: T.textMuted,
              fontSize: 12,
            }}
          >
            <span
              className="lenium-live-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: T.green,
                display: "inline-block",
              }}
            />
            {asset.name} — live price
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              marginTop: 4,
            }}
          >
            <span
              style={{
                color: T.textPrimary,
                fontSize: 28,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
              }}
            >
              {spot > 0 ? `$${fmtPrice(spot, asset.decimals)}` : "—"}
            </span>
            {baseline > 0 && (
              <span
                style={{
                  color: up ? T.green : T.red,
                  fontSize: 13,
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {up ? "+" : "−"}
                {fmtPrice(Math.abs(change), asset.decimals)} (
                {up ? "+" : "−"}
                {Math.abs(changePct).toFixed(2)}%)
                {range === "1D" ? " today" : ` ${range.toLowerCase()}`}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 2 }}>
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
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          height: CHART_HEIGHT,
          marginTop: 8,
        }}
      >
        {isPending || points.length < 2 ? (
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
            {isPending ? (
              <span
                className="lenium-skeleton"
                style={{ width: "100%", height: "85%", borderRadius: 8 }}
              />
            ) : (
              "Live price data unavailable right now"
            )}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <ComposedChart
              data={points}
              margin={{ top: 10, right: 4, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient
                  id={`underlying-fill-${asset.symbol}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={up ? "rgba(0,232,122,0.16)" : "rgba(255,77,77,0.14)"}
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
                domain={[yMin, yMax]}
                tickFormatter={(v: number) => fmtAxis(v, asset.decimals)}
                tick={{ fill: T.textMuted, fontSize: 11 }}
                orientation="right"
                axisLine={false}
                tickLine={false}
                width={64}
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
                      <div
                        style={{
                          color: T.textSecondary,
                          fontSize: 11,
                          marginBottom: 4,
                        }}
                      >
                        {formatTooltipTs(Number(label))}
                      </div>
                      <div
                        style={{
                          color: T.textPrimary,
                          fontSize: 13,
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        ${fmtPrice(Number(payload[0].value), asset.decimals)}
                      </div>
                    </div>
                  );
                }}
              />
              {strikeVisible && (
                <ReferenceLine
                  y={strike.value}
                  stroke={T.textMuted}
                  strokeDasharray="6 4"
                  strokeWidth={1}
                  label={{
                    value: strike.label,
                    position: "insideTopLeft",
                    fill: T.textSecondary,
                    fontSize: 11,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="price"
                stroke="none"
                fill={`url(#underlying-fill-${asset.symbol})`}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={lineColor}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
