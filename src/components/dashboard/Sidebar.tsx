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
} from "@tabler/icons-react";
import { useAccountStore } from "@/stores/accountStore";
import { CategoryFilter } from "@/components/dashboard/CategoryFilter";
import { ChallengeWidget } from "@/components/dashboard/ChallengeWidget";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { T, TOP_BAR_HEIGHT, SIDEBAR_WIDTH } from "@/lib/tokens";

const NAV_ITEMS = [
  { icon: IconLayoutGrid, label: "Markets", href: "/dashboard/markets" },
  { icon: IconChartCandle, label: "My Positions", href: "/dashboard/positions" },
  { icon: IconTarget, label: "Challenge Progress", href: "/dashboard/progress" },
  { icon: IconWallet, label: "Payouts", href: "/dashboard/payouts" },
  { icon: IconHistory, label: "Trade History", href: "/dashboard/history" },
  { icon: IconSettings, label: "Settings", href: "/dashboard/settings" },
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

      <nav style={{ padding: 8 }}>
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                height: 38,
                padding: "0 10px",
                borderRadius: T.radius,
                background: active ? T.bgTertiary : "transparent",
                borderLeft: active
                  ? `2px solid ${T.green}`
                  : "2px solid transparent",
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
        })}
      </nav>

      <Divider />

      <div style={{ overflowY: "auto", flexShrink: 1 }}>
        <CategoryFilter />
      </div>

      <div style={{ flexGrow: 1 }} />

      <div style={{ padding: 12 }}>
        <ErrorBoundary name="Challenge widget">
          <ChallengeWidget />
        </ErrorBoundary>
      </div>
    </aside>
  );
}

function Divider() {
  return <div style={{ height: 0.5, background: T.border, margin: 0 }} />;
}
