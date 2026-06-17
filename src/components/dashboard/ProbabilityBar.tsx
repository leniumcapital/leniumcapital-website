"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { getProbabilityColor } from "@/lib/utils";

export type ProbabilityBarProps = {
  /** Current probability in percent (0–100). */
  probability: number;
  height?: number;
  loading?: boolean;
  /** Play a one-time 0 → value entrance on mount. */
  entrance?: boolean;
};

export function ProbabilityBar({
  probability,
  height = 3,
  loading = false,
  entrance = true,
}: ProbabilityBarProps) {
  const enteredRef = useRef(false);
  const pct = Math.min(100, Math.max(0, probability));
  const color = getProbabilityColor(pct);
  const glow =
    pct > 80 ? "0 0 6px 1px rgba(0,232,122,0.35)" : "0 0 0 0 rgba(0,232,122,0)";

  const trackStyle = {
    width: "100%",
    height,
    background: "#1C1C1C",
    borderRadius: 999,
    overflow: "hidden" as const,
    position: "relative" as const,
  };

  if (loading) {
    return (
      <div style={trackStyle}>
        <div
          className="lenium-skeleton"
          style={{ width: "100%", height: "100%", borderRadius: 999 }}
        />
      </div>
    );
  }

  const isEntrance = entrance && !enteredRef.current;

  return (
    <div style={trackStyle}>
      <motion.div
        initial={isEntrance ? { width: "0%" } : false}
        animate={{
          width: `${pct}%`,
          backgroundColor: color,
          boxShadow: glow,
        }}
        transition={
          isEntrance
            ? { duration: 0.4, delay: 0.2, ease: "easeOut" }
            : { duration: 0.6, ease: "easeOut" }
        }
        onAnimationComplete={() => {
          enteredRef.current = true;
        }}
        style={{
          height: "100%",
          borderRadius: 999,
        }}
      />
    </div>
  );
}
