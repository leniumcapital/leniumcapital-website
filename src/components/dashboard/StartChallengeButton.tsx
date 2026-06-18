"use client";

import type { CSSProperties, ReactNode } from "react";
import { openOnboardingFlow } from "@/components/dashboard/DashboardOnboardingModal";
import { needsAccountSetup } from "@/lib/accountSetup";
import { useAccountStore } from "@/stores/accountStore";
import { useUiStore } from "@/stores/uiStore";
import { T } from "@/lib/tokens";

interface StartChallengeButtonProps {
  children?: ReactNode;
  fullWidth?: boolean;
  style?: CSSProperties;
  /** Open demo tier picker directly when the user has no account yet. */
  preferDemo?: boolean;
}

/** Opens onboarding or the live challenge modal — stays on the dashboard. */
export function StartChallengeButton({
  children,
  fullWidth = false,
  style,
  preferDemo = false,
}: StartChallengeButtonProps) {
  const account = useAccountStore((s) => ({
    accountType: s.accountType,
    challengeStatus: s.challengeStatus,
    hasActiveChallenge: s.hasActiveChallenge,
    tier: s.tier,
  }));
  const openChallengeModal = useUiStore((s) => s.openChallengeModal);

  function handleClick() {
    if (needsAccountSetup(account)) {
      openOnboardingFlow(preferDemo ? "demo" : "mode");
      return;
    }
    openChallengeModal();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
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
