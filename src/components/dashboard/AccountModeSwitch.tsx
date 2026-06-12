"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAccountStore } from "@/stores/accountStore";
import { useChallengeStore } from "@/stores/challengeStore";
import { usePositionStore } from "@/stores/positionStore";
import type { AccountChallengeStatus } from "@/stores/accountStore";
import type { ChallengeStatus } from "@/lib/users";
import { T } from "@/lib/tokens";

type Mode = "demo" | "live";

function mapStatus(status: ChallengeStatus): AccountChallengeStatus {
  switch (status) {
    case "in_progress":
      return "active";
    case "passed":
    case "funded":
      return "passed";
    case "failed":
      return "breached";
    case "pending":
      return "none";
  }
}

export function AccountModeSwitch() {
  const router = useRouter();
  const { update } = useSession();
  const accountType = useAccountStore((s) => s.accountType);
  const hasDemo = useAccountStore((s) => s.hasDemoAccount);
  const hasLive = useAccountStore((s) => s.hasLiveAccount);
  const setAccount = useAccountStore((s) => s.setAccount);
  const setDailyLockout = useAccountStore((s) => s.setDailyLockout);
  const [switching, setSwitching] = useState(false);

  const activeMode: Mode =
    accountType === "funded" ? "live" : accountType === "challenge" ? "demo" : "demo";

  async function switchTo(mode: Mode) {
    if (switching) return;
    const targetType = mode === "demo" ? "challenge" : "funded";

    if (mode === "demo" && !hasDemo) {
      toast.info("Start a demo challenge first.", {
        action: {
          label: "Select challenge",
          onClick: () => router.push("/dashboard/challenge/select"),
        },
      });
      return;
    }

    if (mode === "live" && !hasLive) {
      toast.info("Pass your challenge to unlock a live funded account.", {
        action: {
          label: "View progress",
          onClick: () => router.push("/dashboard/progress"),
        },
      });
      return;
    }

    if (
      (mode === "demo" && accountType === "challenge") ||
      (mode === "live" && accountType === "funded")
    ) {
      return;
    }

    setSwitching(true);
    try {
      const res = await fetch("/api/accounts/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountType: targetType }),
      });
      const data = (await res.json()) as {
        error?: string;
        account?: {
          accountType: "challenge" | "funded";
          tier: number;
          balance: number;
          challengeStatus: ChallengeStatus;
        };
      };

      if (!res.ok || !data.account) {
        toast.error(data.error ?? "Could not switch accounts.");
        return;
      }

      const a = data.account;
      const storeType = a.accountType === "funded" ? "funded" : "challenge";

      setAccount({
        accountType: storeType,
        challengeStatus: mapStatus(a.challengeStatus),
        tier: a.tier,
        balance: a.balance,
        accountSize: a.tier,
        hasDemoAccount: mode === "demo" ? true : hasDemo,
        hasLiveAccount: mode === "live" ? true : hasLive,
      });
      setDailyLockout(false);

      useChallengeStore.getState().reset();
      usePositionStore.getState().reset();

      await update({
        user: {
          accountType: a.accountType,
          tier: a.tier,
          balance: a.balance,
          challengeStatus: a.challengeStatus,
        },
      });

      toast.success(
        mode === "demo" ? "Switched to demo account" : "Switched to live account",
      );
      router.refresh();
    } catch {
      toast.error("Could not switch accounts. Try again.");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: T.font,
      }}
    >
      <div
        role="group"
        aria-label="Switch between demo and live account"
        style={{
          display: "flex",
          padding: 3,
          borderRadius: 10,
          background: T.bgTertiary,
          border: T.hairline(),
        }}
      >
        <ModeButton
          label="Demo"
          active={activeMode === "demo" && accountType !== "none"}
          disabled={switching}
          available={hasDemo}
          onClick={() => void switchTo("demo")}
        />
        <ModeButton
          label="Live"
          active={activeMode === "live"}
          disabled={switching}
          available={hasLive}
          onClick={() => void switchTo("live")}
        />
      </div>

      {accountType === "none" && (
        <Link
          href="/dashboard/challenge/select"
          style={{
            fontSize: 11,
            color: T.green,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          Start challenge →
        </Link>
      )}
    </div>
  );
}

function ModeButton({
  label,
  active,
  disabled,
  available,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  available: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        position: "relative",
        border: "none",
        background: "transparent",
        padding: "6px 14px",
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? "wait" : "pointer",
        color: active ? T.bgPrimary : available ? T.textSecondary : T.textMuted,
        borderRadius: 8,
        fontFamily: T.font,
        opacity: available ? 1 : 0.55,
        transition: `color ${T.transition}`,
      }}
    >
      {active && (
        <motion.span
          layoutId="account-mode-pill"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 8,
            background: label === "Live" ? T.green : T.amber,
            zIndex: 0,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span style={{ position: "relative", zIndex: 1 }}>{label}</span>
    </button>
  );
}
