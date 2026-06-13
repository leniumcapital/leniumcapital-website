"use client";

import type { CSSProperties, ReactNode } from "react";
import { useUiStore } from "@/stores/uiStore";
import { T } from "@/lib/tokens";

interface StartChallengeButtonProps {
  children?: ReactNode;
  fullWidth?: boolean;
  style?: CSSProperties;
}

/** Opens the in-dashboard challenge modal — never leaves the dashboard. */
export function StartChallengeButton({
  children,
  fullWidth = false,
  style,
}: StartChallengeButtonProps) {
  const open = useUiStore((s) => s.openChallengeModal);

  return (
    <button
      type="button"
      onClick={open}
      style={{
        display: fullWidth ? "block" : "inline-flex",
        width: fullWidth ? "100%" : undefined,
        boxSizing: "border-box",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background: T.green,
        color: T.bgPrimary,
        border: "none",
        borderRadius: 6,
        padding: "8px 18px",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: T.font,
        transition: `opacity ${T.transition}`,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "0.9";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
    >
      {children ?? "Start a challenge →"}
    </button>
  );
}
