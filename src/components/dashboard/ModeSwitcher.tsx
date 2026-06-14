"use client";

import { motion } from "framer-motion";
import { IconFlask } from "@tabler/icons-react";
import { toast } from "sonner";
import { useAccountStore } from "@/stores/accountStore";
import { useUiStore } from "@/stores/uiStore";
import { T } from "@/lib/tokens";

export function ModeSwitcher() {
  const tradingMode = useAccountStore((s) => s.tradingMode);
  const hasFundedAccount = useAccountStore((s) => s.hasFundedAccount);
  const setTradingMode = useAccountStore((s) => s.setTradingMode);
  const openAccountGate = useUiStore((s) => s.openAccountGate);

  function selectDemo() {
    if (tradingMode === "demo") return;
    setTradingMode("demo");
    toast("Switched to demo challenge account", { duration: 2000 });
  }

  function selectLive() {
    if (tradingMode === "live") return;
    if (!hasFundedAccount) {
      openAccountGate();
      return;
    }
    setTradingMode("live");
    toast("Switched to funded account", { duration: 2000 });
  }

  return (
    <div
      role="group"
      aria-label="Trading mode"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "row",
        gap: 2,
        height: 34,
        padding: 3,
        background: "#161616",
        border: T.hairline(),
        borderRadius: T.radiusPill,
      }}
    >
      <ModeButton
        label="Demo"
        active={tradingMode === "demo"}
        activeBg={T.amber}
        onClick={selectDemo}
        layoutId="mode-switcher"
      />
      <ModeButton
        label="Live"
        active={tradingMode === "live"}
        activeBg={T.green}
        onClick={selectLive}
        layoutId="mode-switcher"
      />
    </div>
  );
}

function ModeButton({
  label,
  active,
  activeBg,
  onClick,
  layoutId,
}: {
  label: string;
  active: boolean;
  activeBg: string;
  onClick: () => void;
  layoutId: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        position: "relative",
        border: "none",
        borderRadius: T.radiusPill,
        padding: "0 16px",
        height: 28,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        background: "transparent",
        color: active ? T.bgPrimary : T.textMuted,
        fontFamily: T.font,
        transition: `color ${T.transition}`,
        zIndex: 1,
      }}
    >
      {active && (
        <motion.div
          layoutId={layoutId}
          style={{
            position: "absolute",
            inset: 0,
            background: activeBg,
            borderRadius: T.radiusPill,
            zIndex: -1,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />
      )}
      {label}
    </button>
  );
}

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
