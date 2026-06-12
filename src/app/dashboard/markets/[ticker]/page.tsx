"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconArrowLeft,
  IconChevronDown,
  IconArrowUpRight,
  IconArrowDownRight,
} from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";
import type { MarketDetail, MarketOutcome } from "@/lib/marketDetail";
import {
  fetchMarketDetailClient,
  marketDetailQueryKey,
} from "@/lib/clientApi";
import { useMarketStore } from "@/stores/marketStore";
import { DetailChart, OUTCOME_COLORS } from "@/components/dashboard/DetailChart";
import { DetailOrderPanel } from "@/components/dashboard/DetailOrderPanel";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { compactUsd } from "@/lib/data";
import { T } from "@/lib/tokens";

type Direction = "yes" | "no";

function formatTimeUntil(expiry: string): string {
  if (!expiry) return "";
  const ms = new Date(expiry).getTime() - Date.now();
  if (Number.isNaN(ms)) return "";
  if (ms <= 0) return "Expired";
  const hours = Math.round(ms / 3_600_000);
  if (hours < 48) return `Expires in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `Expires in ${days} days`;
}

function formatExpiryExact(expiry: string): string {
  if (!expiry) return "";
  const d = new Date(expiry);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default function MarketDetailPage() {
  const params = useParams<{ ticker: string }>();
  const router = useRouter();
  const ticker = decodeURIComponent(params.ticker);

  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<Direction>("yes");

  const { data: detail, isPending, isError } = useQuery({
    queryKey: marketDetailQueryKey(ticker),
    queryFn: () => fetchMarketDetailClient(ticker),
    refetchInterval: 5_000, // keeps detail + outcome prices live
    staleTime: 4_000,
  });

  // Live store price (streamed) overrides the queried snapshot when present.
  const liveYes = useMarketStore((s) => s.markets[ticker]?.yesPrice);

  if (isPending) return <DetailSkeleton />;
  if (isError || !detail) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "120px 24px",
          fontFamily: T.font,
        }}
      >
        <span style={{ color: T.textPrimary, fontSize: 15 }}>
          Unable to load this market
        </span>
        <button
          type="button"
          onClick={() => router.push("/dashboard/markets")}
          style={{
            border: T.hairline(),
            background: "transparent",
            color: T.textSecondary,
            borderRadius: 6,
            padding: "8px 16px",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: T.font,
          }}
        >
          Back to markets
        </button>
      </div>
    );
  }

  const currentYes = liveYes ?? detail.yesPrice;
  const isMulti = detail.outcomes.length > 1;
  const activeOutcomeTicker =
    selectedOutcome ?? detail.outcomes[0]?.ticker ?? detail.ticker;

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        alignItems: "flex-start",
        padding: "20px 24px 64px",
        fontFamily: T.font,
        maxWidth: 1400,
      }}
    >
      {/* ── Left column: 65% ─────────────────────────────────────────────────── */}
      <div style={{ flex: "1 1 65%", minWidth: 0 }}>
        <BackButton onClick={() => router.back()} />

        {/* Breadcrumb */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 12,
            marginTop: 14,
          }}
        >
          <span style={{ color: T.textMuted }}>Markets</span>
          <span style={{ color: T.textMuted, padding: "0 6px" }}>/</span>
          <span style={{ color: T.textPrimary }}>{detail.category}</span>
        </div>

        {/* Title */}
        <h1
          style={{
            margin: "10px 0 0",
            color: T.textPrimary,
            fontSize: 22,
            fontWeight: 500,
            lineHeight: 1.3,
            maxWidth: 680,
          }}
        >
          {isMulti ? detail.eventTitle : detail.question}
        </h1>

        {/* Metadata row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
            color: T.textMuted,
            fontSize: 12,
            flexWrap: "wrap",
          }}
        >
          <span>{compactUsd(detail.volume)} vol</span>
          <span>·</span>
          <span>{formatTimeUntil(detail.expiry)}</span>
          <span>·</span>
          <span>{formatExpiryExact(detail.expiry)}</span>
        </div>

        <ErrorBoundary name="Price chart">
          <DetailChart
            ticker={detail.ticker}
            outcomes={detail.outcomes}
            currentPrice={currentYes}
            prevPrice={detail.prevPrice}
          />
        </ErrorBoundary>

        {isMulti && (
          <OutcomesTable
            outcomes={detail.outcomes}
            selectedOutcome={activeOutcomeTicker}
            onPick={(t, dir) => {
              setSelectedOutcome(t);
              setSelectedDirection(dir);
            }}
          />
        )}

        <RulesSection detail={detail} />

        <RelatedMarkets
          category={detail.category}
          excludeTickers={detail.outcomes.map((o) => o.ticker)}
        />
      </div>

      {/* ── Right column: 35%, sticky order entry ───────────────────────────── */}
      <div
        style={{
          flex: "0 0 35%",
          maxWidth: 380,
          position: "sticky",
          top: 16,
        }}
      >
        <ErrorBoundary name="Order entry">
          <DetailOrderPanel
            detail={detail}
            selectedOutcomeTicker={activeOutcomeTicker}
            selectedDirection={selectedDirection}
            onSelectOutcome={setSelectedOutcome}
            onSelectDirection={setSelectedDirection}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}

// ─── Back button ──────────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const color = hovered ? T.textPrimary : T.textMuted;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        transition: `color ${T.transition}`,
      }}
    >
      <IconArrowLeft size={16} color={color} stroke={1.5} />
      <span style={{ color, fontSize: 13, transition: `color ${T.transition}` }}>
        Back to markets
      </span>
    </div>
  );
}

// ─── Outcomes table (multi-outcome only) ──────────────────────────────────────

function OutcomesTable({
  outcomes,
  selectedOutcome,
  onPick,
}: {
  outcomes: MarketOutcome[];
  selectedOutcome: string;
  onPick: (ticker: string, direction: Direction) => void;
}) {
  return (
    <div style={{ marginTop: 24 }}>
      {outcomes.map((o, i) => {
        const change = o.prevPrice > 0 ? o.yesPrice - o.prevPrice : 0;
        const selected = o.ticker === selectedOutcome;
        return (
          <div
            key={o.ticker}
            style={{
              height: 52,
              padding: "0 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              borderTop: i === 0 ? "none" : T.hairline(),
              background: selected ? "rgba(255,255,255,0.02)" : "transparent",
              borderRadius: selected ? 8 : 0,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: OUTCOME_COLORS[i % OUTCOME_COLORS.length],
                flexShrink: 0,
              }}
            />
            <span
              title={o.name}
              style={{
                flex: 1,
                minWidth: 0,
                color: T.textPrimary,
                fontSize: 14,
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {o.name}
            </span>
            <span
              style={{
                color: T.textPrimary,
                fontSize: 18,
                fontWeight: 600,
                minWidth: 64,
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {o.yesPrice}%
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                minWidth: 56,
                justifyContent: "flex-end",
                color: change > 0 ? T.green : change < 0 ? T.red : T.textMuted,
                fontSize: 12,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {change !== 0 &&
                (change > 0 ? (
                  <IconArrowUpRight size={13} stroke={1.5} />
                ) : (
                  <IconArrowDownRight size={13} stroke={1.5} />
                ))}
              {change === 0 ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(1)}`}
            </span>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => onPick(o.ticker, "yes")}
                style={{
                  background: "rgba(0,232,122,0.1)",
                  border: "0.5px solid rgba(0,232,122,0.3)",
                  color: T.green,
                  borderRadius: 6,
                  padding: "6px 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: T.font,
                  whiteSpace: "nowrap",
                }}
              >
                Yes {o.yesPrice}¢
              </button>
              <button
                type="button"
                onClick={() => onPick(o.ticker, "no")}
                style={{
                  background: T.bgTertiary,
                  border: T.hairline(),
                  color: "#666666",
                  borderRadius: 6,
                  padding: "6px 14px",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: T.font,
                  whiteSpace: "nowrap",
                }}
              >
                No {o.noPrice}¢
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Collapsible rules ────────────────────────────────────────────────────────

function Collapsible({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 0",
          borderTop: T.hairline(),
          borderBottom: "none",
          borderLeft: "none",
          borderRight: "none",
          background: "none",
          cursor: "pointer",
          fontFamily: T.font,
        }}
      >
        <span style={{ color: T.textPrimary, fontSize: 14, fontWeight: 500 }}>
          {title}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: "flex" }}
        >
          <IconChevronDown size={16} color={T.textMuted} stroke={1.5} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ paddingBottom: 16 }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RulesSection({ detail }: { detail: MarketDetail }) {
  return (
    <div style={{ marginTop: 32 }}>
      <Collapsible title="Market Rules" defaultOpen>
        <p
          style={{
            margin: 0,
            color: T.textSecondary,
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          {detail.rulesPrimary ||
            "This market resolves according to the official Kalshi resolution criteria for this event."}
        </p>
        {detail.rulesSecondary && (
          <p
            style={{
              margin: "10px 0 0",
              color: T.textSecondary,
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            {detail.rulesSecondary}
          </p>
        )}
        <div style={{ color: T.textMuted, fontSize: 12, marginTop: 12 }}>
          Sources: Kalshi official market resolution sources
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <GhostButton label="View full rules" />
          <GhostButton label="Report Insider Trading" />
        </div>
      </Collapsible>

      <Collapsible title="Timeline and payout">
        <p
          style={{
            margin: 0,
            color: T.textSecondary,
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          Positions settle when the market resolves
          {detail.expiry ? ` (expected ${formatExpiryExact(detail.expiry)})` : ""}.
          Winning contracts pay out $1.00 each; losing contracts expire
          worthless. Simulated challenge balances update immediately on
          settlement.
        </p>
      </Collapsible>

      <Collapsible title="Insider trading is prohibited">
        <p
          style={{
            margin: 0,
            color: T.textSecondary,
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          Trading on material non-public information is prohibited. Accounts
          found violating this rule are closed and any payouts are forfeited.
        </p>
      </Collapsible>
    </div>
  );
}

function GhostButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      style={{
        border: T.hairline(),
        borderRadius: 6,
        padding: "7px 14px",
        color: T.textSecondary,
        fontSize: 12,
        background: "transparent",
        cursor: "pointer",
        fontFamily: T.font,
      }}
    >
      {label}
    </button>
  );
}

// ─── Related markets ──────────────────────────────────────────────────────────

function RelatedMarkets({
  category,
  excludeTickers,
}: {
  category: string;
  excludeTickers: string[];
}) {
  const router = useRouter();
  const related = useMarketStore(
    useShallow((s) => {
      const exclude = new Set(excludeTickers);
      return s.order
        .filter((t) => {
          const m = s.markets[t];
          return (
            m &&
            m.category === category &&
            !exclude.has(t) &&
            m.yesPrice > 0 &&
            m.volume > 0
          );
        })
        .sort((a, b) => s.markets[b].volume - s.markets[a].volume)
        .slice(0, 3)
        .map((t) => {
          const m = s.markets[t];
          return {
            ticker: t,
            question: m.question,
            category: m.category,
            yesPrice: m.yesPrice,
            sparklineData: m.sparklineData,
            open24h: m.open24h,
          };
        });
    }),
  );

  if (related.length === 0) return null;

  return (
    <div style={{ marginTop: 32 }}>
      <div
        style={{
          color: T.textPrimary,
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 14,
        }}
      >
        People are also trading
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {related.map((m) => (
          <RelatedCard
            key={m.ticker}
            market={m}
            onClick={() =>
              router.push(`/dashboard/markets/${encodeURIComponent(m.ticker)}`)
            }
          />
        ))}
      </div>
    </div>
  );
}

function RelatedCard({
  market,
  onClick,
}: {
  market: {
    ticker: string;
    question: string;
    category: string;
    yesPrice: number;
    sparklineData: number[];
    open24h: number;
  };
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hasSpark = market.sparklineData.length >= 2;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        minWidth: 0,
        background: T.bgSecondary,
        border: T.hairline(hovered ? T.borderHover : T.border),
        borderRadius: 10,
        padding: 14,
        cursor: "pointer",
        transition: `border-color ${T.transition}`,
      }}
    >
      <span
        style={{
          display: "inline-block",
          background: T.bgTertiary,
          border: T.hairline(),
          borderRadius: 4,
          padding: "2px 8px",
          fontSize: 11,
          color: T.textMuted,
        }}
      >
        {market.category}
      </span>
      <div
        title={market.question}
        style={{
          marginTop: 10,
          color: T.textPrimary,
          fontSize: 13,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {market.question}
      </div>
      <div
        style={{
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: T.textPrimary, fontSize: 20, fontWeight: 500 }}>
          {market.yesPrice}%
        </span>
        {hasSpark && (
          <Sparkline
            data={market.sparklineData}
            up={market.yesPrice >= market.sparklineData[0]}
            width={60}
            height={20}
          />
        )}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        padding: "20px 24px",
        alignItems: "flex-start",
      }}
    >
      <div style={{ flex: "1 1 65%", display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="lenium-skeleton" style={{ width: 120, height: 16 }} />
        <div className="lenium-skeleton" style={{ width: "70%", height: 28 }} />
        <div className="lenium-skeleton" style={{ width: 280, height: 14 }} />
        <div className="lenium-skeleton" style={{ width: "100%", height: 320, borderRadius: 10 }} />
        <div className="lenium-skeleton" style={{ width: "100%", height: 160, borderRadius: 10 }} />
      </div>
      <div style={{ flex: "0 0 35%", maxWidth: 380 }}>
        <div className="lenium-skeleton" style={{ width: "100%", height: 420, borderRadius: 12 }} />
      </div>
    </div>
  );
}
