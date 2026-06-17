"use client";

import { motion } from "framer-motion";
import { IconFlask } from "@tabler/icons-react";
import { useAccountStore } from "@/stores/accountStore";
import { T } from "@/lib/tokens";

/** Amber DEMO pill for market subheaders. */
export function DemoModePill() {
  const tradingMode = useAccountStore((s) => s.tradingMode);
  if (tradingMode !== "demo") return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "rgba(245,158,11,0.1)",
        border: "0.5px solid rgba(245,158,11,0.3)",
        color: T.amber,
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 500,
        marginLeft: 8,
        verticalAlign: "middle",
      }}
    >
      DEMO
    </span>
  );
}

/** Amber SIMULATED label for the positions table. */
export function SimulatedPositionsLabel() {
  const tradingMode = useAccountStore((s) => s.tradingMode);
  if (tradingMode !== "demo") return null;

  return (
    <div style={{ padding: "16px 16px 0" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          background: "rgba(245,158,11,0.1)",
          border: "0.5px solid rgba(245,158,11,0.3)",
          color: T.amber,
          borderRadius: 4,
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 500,
        }}
      >
        SIMULATED
      </span>
    </div>
  );
}

/** Subtle demo disclaimer below order confirm buttons. */
export function DemoOrderDisclaimer() {
  const tradingMode = useAccountStore((s) => s.tradingMode);
  if (tradingMode !== "demo") return null;

  return (
    <p
      style={{
        marginTop: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        textAlign: "center",
        color: T.textMuted,
        fontSize: 11,
        lineHeight: 1.4,
      }}
    >
      <IconFlask size={12} stroke={1.5} aria-hidden />
      Simulated account · orders mirror live Kalshi prices
    </p>
  );
}
