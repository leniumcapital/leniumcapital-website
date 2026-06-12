"use client";

import React from "react";
import { LineChart, Line } from "recharts";
import { T } from "@/lib/tokens";

interface SparklineProps {
  data: number[];
  /** Current price vs 24h open decides the stroke color. */
  up: boolean;
  width?: number;
  height?: number;
}

function SparklineInner({ data, up, width = 80, height = 28 }: SparklineProps) {
  const points = data.map((p, i) => ({ i, p }));
  return (
    <LineChart
      width={width}
      height={height}
      data={points}
      margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
    >
      <Line
        type="monotone"
        dataKey="p"
        stroke={up ? T.green : T.textSecondary}
        strokeWidth={1.5}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
}

/** Skip re-render unless the series actually changed. */
export const Sparkline = React.memo(SparklineInner, (prev, next) => {
  if (prev.up !== next.up) return false;
  if (prev.data.length !== next.data.length) return false;
  return (
    prev.data[prev.data.length - 1] === next.data[next.data.length - 1] &&
    prev.data[0] === next.data[0]
  );
});
