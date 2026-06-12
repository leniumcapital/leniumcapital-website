"use client";

import { useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";
import {
  IconSearch,
  IconBell,
  IconChartLine,
  IconWallet,
  IconSettings,
  IconLogout,
} from "@tabler/icons-react";
import { LeniumMark } from "@/components/ui/LeniumLogo";
import { ConnectionStatus } from "@/components/dashboard/ConnectionStatus";
import { BalanceDisplay } from "@/components/dashboard/BalanceDisplay";
import { SearchModal } from "@/components/dashboard/SearchModal";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { useAccountStore } from "@/stores/accountStore";
import { useUiStore } from "@/stores/uiStore";
import { resetAllStores } from "@/stores";
import { T, TOP_BAR_HEIGHT } from "@/lib/tokens";

interface TopBarProps {
  /** Search input ref so the layout's "/" shortcut can focus it. */
  searchInputRef: RefObject<HTMLInputElement | null>;
}

export function TopBar({ searchInputRef }: TopBarProps) {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: TOP_BAR_HEIGHT,
        zIndex: 50,
        background: T.bgPrimary,
        borderBottom: T.hairline(),
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        fontFamily: T.font,
      }}
    >
      <LeftSection />
      <CenterSection searchInputRef={searchInputRef} />
      <ErrorBoundary name="Account controls">
        <RightSection />
      </ErrorBoundary>
    </header>
  );
}

// ─── Left: seal, wordmark, account-state pill ────────────────────────────────

function LeftSection() {
  const accountType = useAccountStore((s) => s.accountType);

  const pill =
    accountType === "challenge"
      ? {
          label: "Demo Challenge",
          bg: "rgba(245,158,11,0.12)",
          border: "rgba(245,158,11,0.3)",
          color: T.amber,
        }
      : accountType === "funded"
        ? {
            label: "Funded Account",
            bg: "rgba(0,232,122,0.1)",
            border: T.greenMutedBorder,
            color: T.green,
          }
        : {
            label: "No Active Challenge",
            bg: T.bgTertiary,
            border: T.border,
            color: T.textMuted,
          };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <LeniumMark size={28} variant="green" />
      <span
        style={{
          color: T.textPrimary,
          fontSize: 15,
          fontWeight: 400,
          letterSpacing: "0.15em",
        }}
      >
        Lenium
      </span>
      <motion.span
        key={pill.label}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          background: pill.bg,
          border: T.hairline(pill.border),
          color: pill.color,
          borderRadius: T.radiusPill,
          padding: "3px 10px",
          fontSize: 11,
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        {pill.label}
      </motion.span>
    </div>
  );
}

// ─── Center: global search ───────────────────────────────────────────────────

function CenterSection({
  searchInputRef,
}: {
  searchInputRef: RefObject<HTMLInputElement | null>;
}) {
  const searchQuery = useUiStore((s) => s.searchQuery);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const [focused, setFocused] = useState(false);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        justifyContent: "center",
        padding: "0 16px",
      }}
    >
      <div style={{ position: "relative", width: "min(420px, 100%)" }}>
        <div
          style={{
            width: "100%",
            height: 34,
            background: T.bgTertiary,
            border: T.hairline(focused ? T.borderHover : T.border),
            borderRadius: T.radius,
            padding: "0 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: `border-color ${T.transition}`,
          }}
        >
          <IconSearch size={15} color={T.textMuted} stroke={1.5} />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search markets"
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              flex: 1,
              fontSize: 13,
              color: T.textPrimary,
              fontFamily: T.font,
            }}
          />
        </div>
        <AnimatePresence>{searchQuery.trim() && <SearchModal />}</AnimatePresence>
      </div>
    </div>
  );
}

// ─── Right: connection, balance, bell, avatar menu ───────────────────────────

function RightSection() {
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const name = useAccountStore((s) => s.name);
  const avatarUrl = useAccountStore((s) => s.avatarUrl);
  const bellRef = useRef<HTMLButtonElement>(null);

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  async function handleLogout() {
    resetAllStores();
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 20, position: "relative" }}
    >
      <ConnectionStatus />
      <BalanceDisplay />

      <button
        ref={bellRef}
        type="button"
        aria-label="Notifications"
        onClick={() => setBellOpen((v) => !v)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          color: T.textMuted,
          transition: `color ${T.transition}`,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = T.textPrimary)}
        onMouseLeave={(e) => (e.currentTarget.style.color = T.textMuted)}
      >
        <IconBell size={18} stroke={1.5} />
      </button>

      <AnimatePresence>
        {bellOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              top: 44,
              right: 44,
              width: 260,
              background: T.bgTertiary,
              border: T.hairline(),
              borderRadius: 10,
              padding: 16,
              zIndex: 60,
            }}
          >
            <span style={{ color: T.textMuted, fontSize: 12 }}>
              No notifications yet
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: "relative" }}>
        <button
          type="button"
          aria-label="Account menu"
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: avatarUrl ? "transparent" : T.border,
            border: T.hairline(T.borderHover),
            color: T.textPrimary,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: T.font,
            overflow: "hidden",
            padding: 0,
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initials || "?"
          )}
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute",
                top: 44,
                right: 0,
                width: 180,
                background: T.bgTertiary,
                border: T.hairline(),
                borderRadius: 10,
                padding: 6,
                zIndex: 60,
              }}
            >
              <MenuItem
                href="/dashboard/progress"
                icon={<IconChartLine size={16} stroke={1.5} />}
                label="Challenge Progress"
                onClick={() => setMenuOpen(false)}
              />
              <MenuItem
                href="/dashboard/payouts"
                icon={<IconWallet size={16} stroke={1.5} />}
                label="Payouts"
                onClick={() => setMenuOpen(false)}
              />
              <MenuItem
                href="/dashboard/settings"
                icon={<IconSettings size={16} stroke={1.5} />}
                label="Settings"
                onClick={() => setMenuOpen(false)}
              />
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  height: 36,
                  padding: "0 12px",
                  width: "100%",
                  background: "none",
                  border: "none",
                  borderRadius: 6,
                  color: T.red,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: T.font,
                  transition: `background ${T.transition}`,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = T.bgSecondary)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <IconLogout size={16} stroke={1.5} />
                Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MenuItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        height: 36,
        padding: "0 12px",
        borderRadius: 6,
        color: T.textPrimary,
        fontSize: 13,
        textDecoration: "none",
        transition: `background ${T.transition}`,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = T.bgSecondary)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ color: T.textMuted, display: "flex" }}>{icon}</span>
      {label}
    </Link>
  );
}
