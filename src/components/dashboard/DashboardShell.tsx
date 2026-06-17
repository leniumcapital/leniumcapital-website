"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import { IconAlertTriangle } from "@tabler/icons-react";
import { LeniumMark } from "@/components/ui/LeniumLogo";
import { TopBar } from "@/components/dashboard/TopBar";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ChallengeStartModal } from "@/components/dashboard/ChallengeStartModal";
import { AccountGateModal } from "@/components/dashboard/AccountGateModal";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { DashboardOnboardingModal, isOnboardingDone } from "@/components/dashboard/DashboardOnboardingModal";
import { useChallengeSync, useChallengeProgress, useMinuteNow } from "@/hooks/useChallengeProgress";
import { useAccountStatusSync } from "@/hooks/useAccountStatus";
import { reconcileCashBalance } from "@/lib/accountBalance";
import { syncChallengeRuleLimits } from "@/stores/challengeStore";
import {
  useAccountStore,
  type AccountType,
  type AccountChallengeStatus,
} from "@/stores/accountStore";
import type { AddonId } from "@/lib/data";
import { useChallengeStore } from "@/stores/challengeStore";
import { usePositionStore } from "@/stores/positionStore";
import { useUiStore } from "@/stores/uiStore";
import { TIERS, usd } from "@/lib/data";
import {
  resolveTierForAccount,
  resolveRules,
  formatRulePct,
  effectiveAccountSize,
  isDrawdownBreached,
  isChallengeExpired,
  equityUsd,
  daysSinceLastTrade,
} from "@/lib/rules";
import {
  INACTIVITY_WARNING_DAYS,
  INACTIVITY_TERMINATE_DAYS,
} from "@/lib/data";
import {
  T,
  TOP_BAR_HEIGHT,
  SIDEBAR_WIDTH,
  MIN_VIEWPORT_WIDTH,
} from "@/lib/tokens";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  accountType: AccountType;
  challengeStatus: AccountChallengeStatus;
  tier: number;
  balance: number;
}

interface DashboardShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  return <ShellInner user={user}>{children}</ShellInner>;
}

function ShellInner({ user, children }: DashboardShellProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [tooNarrow, setTooNarrow] = useState(false);

  // Seed account state from the (server-validated) session.
  useEffect(() => {
    useAccountStore.getState().setAccount({
      userId: user.id,
      name: user.name,
      email: user.email,
      accountType: user.accountType,
      challengeStatus: user.challengeStatus,
      tier: user.tier,
      balance: user.balance,
      accountSize: user.tier,
      challengeTier: user.accountType === "challenge" ? user.tier : 0,
      fundedTier: user.accountType === "funded" ? user.tier : 0,
    });
    syncChallengeRuleLimits();
    reconcileCashBalance();
  }, [user]);

  // Apply tier + add-ons from checkout URL (?tier=25000&addons=split90,doubletime).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tierParam = Number(params.get("tier"));
    const addonsParam = params.get("addons");
    if (tierParam > 0) {
      useAccountStore.getState().setAccount({
        tier: tierParam,
        accountSize: tierParam,
        accountType: "challenge",
        challengeStatus: "active",
      });
    }
    if (addonsParam) {
      const ids = addonsParam.split(",").filter(Boolean) as AddonId[];
      useAccountStore.getState().setAddons(ids);
    }
  }, []);

  // The live Kalshi feed runs in KalshiMarketProvider at the app root — it
  // survives every navigation. Only challenge bookkeeping lives here.
  const accountStatusLoaded = useAccountStatusSync();
  useDashboardOnboarding(user, accountStatusLoaded);
  useChallengeSync();
  useRuleEnforcement();

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ── Minimum viewport guard (ResizeObserver on the document element) ───────
  useEffect(() => {
    const check = () => setTooNarrow(window.innerWidth < MIN_VIEWPORT_WIDTH);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);

  if (tooNarrow) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: T.bgPrimary,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
          fontFamily: T.font,
          zIndex: 200,
        }}
      >
        <LeniumMark size={40} variant="green" />
        <span style={{ color: T.textPrimary, fontSize: 20, fontWeight: 500 }}>
          Best experienced on desktop
        </span>
        <span style={{ color: T.textMuted, fontSize: 14, maxWidth: 380 }}>
          Please widen this window — or rotate your device to landscape — to
          access the trading dashboard
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: T.bgPrimary,
        fontFamily: T.font,
      }}
    >
      <TopBar searchInputRef={searchInputRef} />

      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar />

        <main
          id="lenium-main"
          style={{
            marginTop: TOP_BAR_HEIGHT,
            marginLeft: SIDEBAR_WIDTH,
            height: `calc(100vh - ${TOP_BAR_HEIGHT}px)`,
            overflowY: "auto",
            overflowX: "hidden",
            // The 48px category tab bar is sticky inside this scroller.
            scrollPaddingTop: 56,
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <RuleBanners />
          {children}
        </main>
      </div>

      <DashboardOnboardingModal />
      <ChallengeStartModal />
      <AccountGateModal />

      <BreachOverlay />

      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: T.bgTertiary,
            border: T.hairline(),
            color: T.textPrimary,
            fontFamily: T.font,
          },
        }}
      />
    </div>
  );
}

/** Show first-login onboarding when the user has no active account yet. */
function useDashboardOnboarding(user: SessionUser, statusLoaded: boolean): void {
  useEffect(() => {
    if (!statusLoaded) return;
    if (isOnboardingDone()) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("tier")) return;

    const account = useAccountStore.getState();
    if (account.hasActiveChallenge || account.hasFundedAccount) return;
    if (user.tier > 0 && user.accountType !== "none") return;
    if (account.accountType !== "none" && account.tier > 0) return;

    useUiStore.getState().openOnboarding();
  }, [user, statusLoaded]);
}

// ─── Automated rule enforcement ───────────────────────────────────────────────

function useRuleEnforcement(): void {
  const breachPostedRef = useRef(false);
  const passPostedRef = useRef(false);
  const now = useMinuteNow();

  useEffect(() => {
    const check = () => {
      const account = useAccountStore.getState();
      const challenge = useChallengeStore.getState();
      const size = effectiveAccountSize({
        accountSize: account.accountSize,
        tier: account.tier,
        challengeTier: account.challengeTier,
        fundedTier: account.fundedTier,
        tradingMode: account.tradingMode,
      });
      if (account.accountType === "none" || size <= 0) return;
      if (account.challengeStatus !== "active") return;

      const tier = resolveTierForAccount(size);
      if (!tier) return;

      const phase =
        account.accountType === "funded" ? "funded" : "evaluation";
      const rules = resolveRules({
        tier,
        addons: account.addons,
        phase,
        currentBalance: equityUsd(size, challenge.currentProfit),
      });

      const equity = equityUsd(size, challenge.currentProfit);

      // Drawdown breach
      if (
        !breachPostedRef.current &&
        isDrawdownBreached({
          rules,
          startingBalance: size,
          equity,
          highWaterMarkUsd: challenge.highWaterMarkUsd,
          staticFloorUsd: challenge.staticFloorUsd,
        })
      ) {
        breachPostedRef.current = true;
        account.setChallengeStatus("breached");
        account.setBreachReason("max_drawdown");
        void fetch("/api/accounts/breach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: "max_drawdown",
            drawdownPct: challenge.currentDrawdown,
          }),
        });
        return;
      }

      // Challenge window expiry (evaluation only)
      if (
        account.accountType === "challenge" &&
        challenge.windowEndDate &&
        isChallengeExpired(challenge.windowEndDate) &&
        !breachPostedRef.current
      ) {
        breachPostedRef.current = true;
        account.setChallengeStatus("expired");
        account.setBreachReason("expired");
        void fetch("/api/accounts/breach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "expired" }),
        });
        return;
      }

      // Evaluation pass
      if (
        account.accountType === "challenge" &&
        !passPostedRef.current &&
        challenge.currentProfit >= challenge.adjustedProfitTarget &&
        challenge.adjustedProfitTarget > 0
      ) {
        passPostedRef.current = true;
        account.setChallengeStatus("passed");
      }

      // Funded inactivity termination
      if (account.accountType === "funded") {
        const idle = daysSinceLastTrade(account.lastTradeAt);
        if (idle >= INACTIVITY_TERMINATE_DAYS && !breachPostedRef.current) {
          breachPostedRef.current = true;
          account.setChallengeStatus("breached");
          account.setBreachReason("inactivity");
          void fetch("/api/accounts/breach", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "inactivity" }),
          });
        }
      }
    };

    const unsubChallenge = useChallengeStore.subscribe(check);
    const unsubAccount = useAccountStore.subscribe(check);
    check();
    return () => {
      unsubChallenge();
      unsubAccount();
    };
  }, [now]);
}

function RuleBanners() {
  const progress = useChallengeProgress();
  const accountType = useAccountStore((s) => s.accountType);
  const lastTradeAt = useAccountStore((s) => s.lastTradeAt);
  const addons = useAccountStore((s) => s.addons);

  if (accountType === "none") return null;

  const banners: { key: string; color: string; bg: string; text: string }[] = [];

  const ddLabel =
    progress.drawdownMode === "trailing" ? "trailing" : "static";

  if (progress.drawdownConsumedPct >= 90) {
    banners.push({
      key: "drawdown-critical",
      color: T.red,
      bg: T.redMuted,
      text: `Critical: portfolio is near your ${ddLabel} floor (${usd(progress.drawdownFloorUsd)}).`,
    });
  } else if (progress.drawdownConsumedPct >= 75) {
    banners.push({
      key: "drawdown-warning",
      color: T.amber,
      bg: T.amberMuted,
      text: `Drawdown warning: ${formatRulePct(progress.currentDrawdown)}% of your ${formatRulePct(progress.maxDrawdown, 0)}% ${ddLabel} limit used.`,
    });
  }

  if (
    progress.adjustedProfitTarget > progress.profitTarget &&
    accountType === "challenge"
  ) {
    banners.push({
      key: "consistency-adjust",
      color: T.amber,
      bg: T.amberMuted,
      text: `Consistency rule: profit target adjusted to ${usd(progress.adjustedProfitTarget)} (one market exceeded ${progress.consistencyCapPct}%).`,
    });
  }

  if (accountType === "funded") {
    const idle = daysSinceLastTrade(lastTradeAt);
    if (idle >= INACTIVITY_WARNING_DAYS && idle < INACTIVITY_TERMINATE_DAYS) {
      banners.push({
        key: "inactivity-warning",
        color: T.amber,
        bg: T.amberMuted,
        text: `Inactivity warning: ${INACTIVITY_TERMINATE_DAYS - idle} days left to place a trade before account termination.`,
      });
    }
  }

  if (addons.includes("split90")) {
    banners.push({
      key: "split90",
      color: T.green,
      bg: T.greenMutedBg,
      text: "90/10 profit split active on this account.",
    });
  }

  return (
    <AnimatePresence>
      {banners.map((b) => (
        <motion.div
          key={b.key}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: b.bg,
            borderBottom: T.hairline(),
            color: b.color,
            fontSize: 13,
            padding: "10px 24px",
            flexShrink: 0,
          }}
        >
          <IconAlertTriangle size={15} stroke={1.5} />
          {b.text}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

function BreachOverlay() {
  const challengeStatus = useAccountStore((s) => s.challengeStatus);
  const breachReason = useAccountStore((s) => s.breachReason);
  const tierSize = useAccountStore((s) => s.tier);
  const tier = TIERS.find((t) => t.size === tierSize);
  const fee = tier?.resetFee ?? 0;

  const showOverlay =
    challengeStatus === "breached" || challengeStatus === "expired";

  const title =
    challengeStatus === "expired"
      ? "Challenge expired"
      : breachReason === "inactivity"
        ? "Account terminated"
        : "Account breached";

  const body =
    challengeStatus === "expired"
      ? "Your 30-day evaluation window ended without reaching the profit target. Purchase a reset at the discounted fee to try again."
      : breachReason === "inactivity"
        ? "Your funded account was inactive for 30 consecutive days and has been terminated per the inactivity policy."
        : "Your account hit its maximum drawdown limit and the challenge has ended. You can reset at a discount and start a fresh attempt at the same account size immediately.";

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,10,10,0.92)",
            backdropFilter: "blur(8px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: T.font,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              background: T.bgSecondary,
              border: T.hairline(),
              borderRadius: T.radiusLg,
              padding: 48,
              maxWidth: 440,
              textAlign: "center",
            }}
          >
            <LeniumMark size={40} variant="green" />
            <span style={{ color: T.textPrimary, fontSize: 24, fontWeight: 500 }}>
              {title}
            </span>
            <span style={{ color: T.textMuted, fontSize: 14, lineHeight: 1.6 }}>
              {body}
            </span>
            {(challengeStatus === "breached" && breachReason !== "inactivity") ||
            challengeStatus === "expired" ? (
            <Link
              href="/checkout/reset"
              style={{
                marginTop: 8,
                background: T.green,
                color: T.bgPrimary,
                borderRadius: T.radius,
                padding: "12px 28px",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Reset for {usd(fee)} →
            </Link>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
