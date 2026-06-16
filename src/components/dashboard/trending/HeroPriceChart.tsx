"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { EventOutcome } from "@/lib/marketDetail";
import { OUTCOME_COLORS } from "@/components/dashboard/DetailChart";
import type { PricePoint } from "@/stores/marketStore";
import { T } from "@/lib/tokens";

type HeroPriceChartProps = {
  outcomes: EventOutcome[];
  histories: Record<string, PricePoint[]>;
  height?: number;
};

export function HeroPriceChart({
  outcomes,
  histories,
  height = 180,
}: HeroPriceChartProps) {
  const charted = outcomes.slice(0, OUTCOME_COLORS.length);
  const maxProb = Math.max(...charted.map((o) => o.yesPrice), 1);

  const data = useMemo(() => {
    const tsSet = new Set<number>();
    for (const o of charted) {
      for (const p of histories[o.ticker] ?? []) tsSet.add(p.t);
    }
    const timestamps = [...tsSet].sort((a, b) => a - b);
    if (timestamps.length === 0) {
      return charted.map((o, i) => ({
        t: i,
        [o.ticker]: o.yesPrice,
      }));
    }
    return timestamps.map((t) => {
      const row: Record<string, number> = { t };
      for (const o of charted) {
        const pts = histories[o.ticker] ?? [];
        let val = o.yesPrice;
        for (const p of pts) {
          if (p.t <= t) val = p.p;
        }
        row[o.ticker] = val;
      }
      return row;
    });
  }, [charted, histories]);

  if (charted.length === 0) {
    return (
      <div
        style={{
          height,
          background: T.bgTertiary,
          borderRadius: T.radius,
        }}
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const d = new Date(Number(label));
            return (
              <div
                style={{
                  background: T.bgTertiary,
                  border: T.hairline(),
                  borderRadius: T.radius,
                  padding: "8px 12px",
                  fontFamily: T.font,
                  fontSize: 12,
                }}
              >
                <div style={{ color: T.textMuted, marginBottom: 6 }}>
                  {d.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                {payload.map((entry, i) => {
                  const key = String(entry.dataKey ?? "");
                  const name =
                    charted.find((o) => o.ticker === key)?.name ?? key;
                  return (
                  <div
                    key={key}
                    style={{
                      color: entry.color ?? T.textPrimary,
                      marginTop: i > 0 ? 4 : 0,
                    }}
                  >
                    {name}: {Number(entry.value).toFixed(0)}%
                  </div>
                  );
                })}
              </div>
            );
          }}
        />
        {charted.map((o, i) => {
          const isLeader = o.yesPrice >= maxProb - 0.5;
          return (
            <Line
              key={o.ticker}
              type="monotone"
              dataKey={o.ticker}
              stroke={isLeader ? T.green : (OUTCOME_COLORS[i] ?? T.textMuted)}
              strokeWidth={isLeader ? 2.5 : 1.5}
              dot={false}
              isAnimationActive={false}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function HeroChartSkeleton({ height = 180 }: { height?: number }) {
  return (
    <div
      className="lenium-skeleton"
      style={{ height, borderRadius: T.radius, width: "100%" }}
    />
  );
}
