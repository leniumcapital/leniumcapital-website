"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutGrid,
  IconChartCandle,
  IconTarget,
  IconWallet,
  IconHistory,
  IconSettings,
  IconUser,
  IconBriefcase,
} from "@tabler/icons-react";
import { useAccountStore } from "@/stores/accountStore";
import { ChallengeWidget } from "@/components/dashboard/ChallengeWidget";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { T, TOP_BAR_HEIGHT, SIDEBAR_WIDTH } from "@/lib/tokens";

const MAIN_NAV = [
  { icon: IconLayoutGrid, label: "Markets", href: "/dashboard/markets" },
  { icon: IconChartCandle, label: "My Positions", href: "/dashboard/positions" },
  { icon: IconTarget, label: "Challenge Progress", href: "/dashboard/progress" },
  { icon: IconWallet, label: "Payouts", href: "/dashboard/payouts" },
  { icon: IconHistory, label: "Trade History", href: "/dashboard/history" },
] as const;

const SETTINGS_NAV = [
  { icon: IconUser, label: "Profile", href: "/dashboard/profile" },
  { icon: IconBriefcase, label: "Account", href: "/dashboard/account" },
  { icon: IconSettings, label: "Challenge Rules", href: "/dashboard/settings" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const name = useAccountStore((s) => s.name);
  const tier = useAccountStore((s) => s.tier);
  const accountType = useAccountStore((s) => s.accountType);

  const tierLabel =
    accountType === "none" || !tier
      ? "No active challenge"
      : `$${tier.toLocaleString()} ${accountType === "funded" ? "Funded" : "Challenge"} Account`;

  const settingsActive = SETTINGS_NAV.some(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
  );

  return (
    <aside
      style={{
        position: "fixed",
        top: TOP_BAR_HEIGHT,
        left: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        background: T.bgPrimary,
        borderRight: T.hairline(),
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: T.font,
        zIndex: 40,
      }}
    >
      <div style={{ padding: "20px 16px 16px" }}>
        <div style={{ color: T.textPrimary, fontSize: 15, fontWeight: 500 }}>
          {name || "Trader"}
        </div>
        <div style={{ color: T.textMuted, fontSize: 12, marginTop: 2 }}>
          {tierLabel}
        </div>
      </div>

      <Divider />

      <nav style={{ padding: 8, overflowY: "auto", flexShrink: 0 }}>
        {MAIN_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        <Divider />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 32,
            padding: "0 10px",
            marginTop: 4,
            marginBottom: 2,
            color: settingsActive ? T.textSecondary : T.textMuted,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          <IconSettings size={13} stroke={1.5} />
          Settings
        </div>

        {SETTINGS_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} nested />
        ))}
      </nav>

      <div style={{ flexGrow: 1 }} />

      <div style={{ padding: 12 }}>
        <ErrorBoundary name="Challenge widget">
          <ChallengeWidget />
        </ErrorBoundary>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  pathname,
  nested = false,
}: {
  item: { icon: typeof IconLayoutGrid; label: string; href: string };
  pathname: string;
  nested?: boolean;
}) {
  const { icon: Icon, label, href } = item;
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        height: 38,
        padding: nested ? "0 10px 0 22px" : "0 10px",
        borderRadius: T.radius,
        background: active ? T.bgTertiary : "transparent",
        borderLeft: active ? `2px solid ${T.green}` : "2px solid transparent",
        color: active ? T.textPrimary : T.textMuted,
        fontSize: 13,
        fontWeight: 400,
        textDecoration: "none",
        transition: `background ${T.transition}`,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = T.bgSecondary;
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <Icon size={17} stroke={1.5} />
      {label}
    </Link>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: 0.5,
        background: T.border,
        margin: "8px 12px",
      }}
    />
  );
}
