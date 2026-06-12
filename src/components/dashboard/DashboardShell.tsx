"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { IconAlertTriangle } from "@tabler/icons-react";
import { LeniumMark } from "@/components/ui/LeniumLogo";
import { TopBar } from "@/components/dashboard/TopBar";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TradingDrawer } from "@/components/dashboard/TradingDrawer";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useChallengeSync, useChallengeProgress } from "@/hooks/useChallengeProgress";
import {
  useAccountStore,
  type AccountType,
  type AccountChallengeStatus,
} from "@/stores/accountStore";
import { useChallengeStore } from "@/stores/challengeStore";
import { usePositionStore, realizedPnlTodayUtc } from "@/stores/positionStore";
import { useUiStore } from "@/stores/uiStore";
import { TIERS, resetFee, usd } from "@/lib/data";
import {
  T,
  TOP_BAR_HEIGHT,
  SIDEBAR_WIDTH,
  DRAWER_WIDTH,
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

const queryClient = new QueryClient();

export function DashboardShell({ user, children }: DashboardShellProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ShellInner user={user}>{children}</ShellInner>
    </QueryClientProvider>
  );
}

function ShellInner({ user, children }: DashboardShellProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [tooNarrow, setTooNarrow] = useState(false);

  // ── Seed account state from the (server-validated) session ────────────────
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
    });
  }, [user]);

  // ── Live feed + challenge bookkeeping ──────────────────────────────────────
  useWebSocket();
  useChallengeSync();
  useRuleEnforcement();

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Escape" && useUiStore.getState().drawerOpen) {
        useUiStore.getState().closeDrawer();
      } else if (e.key === "/") {
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

  const drawerOpen = useUiStore((s) => s.drawerOpen);

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
          Please open Lenium on a larger screen — or rotate your tablet to
          landscape — to access the trading dashboard
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
          style={{
            marginTop: TOP_BAR_HEIGHT,
            marginLeft: SIDEBAR_WIDTH,
            height: `calc(100vh - ${TOP_BAR_HEIGHT}px)`,
            overflowY: "auto",
            overflowX: "hidden",
            // Subheader (48) + category tab bar (44) are sticky inside this
            // scroller; with the 56px top bar the full sticky stack is 148px.
            scrollPaddingTop: 92,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            paddingRight: drawerOpen ? DRAWER_WIDTH : 0,
            transition: "padding-right 300ms cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        >
          <RuleBanners />
          {children}
        </main>
      </div>

      <ErrorBoundary name="Trading drawer">
        <TradingDrawer />
      </ErrorBoundary>

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

// ─── Automated rule enforcement ───────────────────────────────────────────────

function useRuleEnforcement(): void {
  const breachPostedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = useChallengeStore.subscribe((challenge) => {
      const account = useAccountStore.getState();
      if (account.accountType === "none" || account.accountSize <= 0) return;

      // Drawdown breach — trips once.
      if (
        challenge.maxDrawdown > 0 &&
        challenge.currentDrawdown >= challenge.maxDrawdown &&
        account.challengeStatus === "active" &&
        !breachPostedRef.current
      ) {
        breachPostedRef.current = true;
        account.setChallengeStatus("breached");
        void fetch("/api/accounts/breach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: "max_drawdown",
            drawdownPct: challenge.currentDrawdown,
          }),
        });
      }
    });
    return unsubscribe;
  }, []);

  // Daily loss lockout, recomputed when closed trades change.
  useEffect(() => {
    const unsubscribe = usePositionStore.subscribe((positions) => {
      const account = useAccountStore.getState();
      const tier = TIERS.find((t) => t.size === account.tier);
      if (!tier) return;
      const limit = (tier.size * tier.dailyLimitPct) / 100;
      const dailyPnl = realizedPnlTodayUtc(positions.closedTrades);
      const lockout = dailyPnl <= -limit;
      if (lockout !== account.dailyLockout) {
        account.setDailyLockout(lockout);
      }
    });
    return unsubscribe;
  }, []);
}

function RuleBanners() {
  const progress = useChallengeProgress();
  const dailyLockout = useAccountStore((s) => s.dailyLockout);
  const accountType = useAccountStore((s) => s.accountType);
  const closedTrades = usePositionStore((s) => s.closedTrades);

  if (accountType === "none") return null;

  const banners: { key: string; color: string; bg: string; text: string }[] = [];

  if (progress.drawdownConsumedPct >= 90) {
    banners.push({
      key: "drawdown-critical",
      color: T.red,
      bg: T.redMuted,
      text: "Critical: you are near your max drawdown limit.",
    });
  } else if (progress.drawdownConsumedPct >= 75) {
    banners.push({
      key: "drawdown-warning",
      color: T.amber,
      bg: T.amberMuted,
      text: `Drawdown warning: you have used ${progress.drawdownConsumedPct.toFixed(0)}% of your ${progress.maxDrawdown}% maximum.`,
    });
  }

  if (dailyLockout) {
    banners.push({
      key: "daily-lockout",
      color: T.red,
      bg: T.redMuted,
      text: "Daily limit reached. Trading unlocks at midnight UTC.",
    });
  } else if (progress.dailyLossLimit > 0) {
    const dailyPnl = realizedPnlTodayUtc(closedTrades);
    if (dailyPnl <= -progress.dailyLossLimit * 0.75) {
      banners.push({
        key: "daily-warning",
        color: T.amber,
        bg: T.amberMuted,
        text: `Daily loss warning: you have used ${Math.min(100, (-dailyPnl / progress.dailyLossLimit) * 100).toFixed(0)}% of your daily loss limit.`,
      });
    }
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
  const tierSize = useAccountStore((s) => s.tier);
  const tier = TIERS.find((t) => t.size === tierSize);
  const fee = tier ? resetFee(tier) : 0;

  return (
    <AnimatePresence>
      {challengeStatus === "breached" && (
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
              Account breached
            </span>
            <span style={{ color: T.textMuted, fontSize: 14, lineHeight: 1.6 }}>
              Your account hit its maximum drawdown limit and the challenge has
              ended. You can reset at a discount and start a fresh attempt at
              the same account size immediately.
            </span>
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
