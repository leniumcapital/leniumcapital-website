"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { MarketDetail } from "@/lib/marketDetail";
import { OutcomeAvatar } from "@/components/dashboard/KalshiImages";
import { useMarketStore } from "@/stores/marketStore";
import { useAccountStore } from "@/stores/accountStore";
import { usePlaceOrder } from "@/hooks/usePositions";
import { usd } from "@/lib/data";
import { T } from "@/lib/tokens";

type Direction = "yes" | "no";

interface DetailOrderPanelProps {
  detail: MarketDetail;
  /** Outcome + direction picked in the outcomes table (multi-outcome). */
  selectedOutcomeTicker: string;
  selectedDirection: Direction;
  onSelectOutcome: (ticker: string) => void;
  onSelectDirection: (direction: Direction) => void;
}

function formatExpiryExact(expiry: string): string {
  if (!expiry) return "—";
  const d = new Date(expiry);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function DetailOrderPanel({
  detail,
  selectedOutcomeTicker,
  selectedDirection,
  onSelectOutcome,
  onSelectDirection,
}: DetailOrderPanelProps) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const accountType = useAccountStore((s) => s.accountType);
  const balance = useAccountStore((s) => s.balance);
  const placeOrder = usePlaceOrder();

  const outcome =
    detail.outcomes.find((o) => o.ticker === selectedOutcomeTicker) ??
    detail.outcomes[0];

  // Live prices: prefer the streaming store (updates every flush), falling
  // back to the detail query data (refetched on an interval).
  const liveYes = useMarketStore((s) =>
    outcome ? s.markets[outcome.ticker]?.yesPrice : undefined,
  );
  const yesPrice = liveYes ?? outcome?.yesPrice ?? detail.yesPrice;
  const noPrice = 100 - yesPrice;

  const dollars = Number.parseFloat(amount) || 0;
  const priceCents = selectedDirection === "yes" ? yesPrice : noPrice;

  const calc = useMemo(() => {
    if (dollars <= 0 || priceCents <= 0 || priceCents >= 100) {
      return { probability: priceCents, payout: 0 };
    }
    return {
      probability: priceCents,
      payout: (dollars / priceCents) * 100,
    };
  }, [dollars, priceCents]);

  const canReview = dollars > 0 && !!outcome;

  const handleSellTab = () => {
    if (accountType !== "funded") {
      toast("Selling is available on funded accounts");
      return;
    }
    setTab("sell");
  };

  const submit = () => {
    if (!outcome) return;
    placeOrder.mutate(
      {
        marketTicker: outcome.ticker,
        direction: selectedDirection,
        size: dollars,
        question:
          detail.outcomes.length > 1
            ? `${detail.eventTitle} — ${outcome.name}`
            : detail.question,
        category: detail.category,
      },
      {
        onSuccess: () => {
          setReviewing(false);
          setAmount("");
        },
        onError: () => setReviewing(false),
      },
    );
  };

  return (
    <div
      style={{
        background: T.bgSecondary,
        border: T.hairline(),
        borderRadius: 12,
        padding: 20,
        fontFamily: T.font,
        overflow: "hidden",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {reviewing ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div style={{ color: T.textPrimary, fontSize: 15, fontWeight: 600 }}>
              Confirm order
            </div>
            <div
              style={{
                marginTop: 14,
                background: T.bgTertiary,
                border: T.hairline(),
                borderRadius: 8,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <SummaryRow label="Market" value={outcome?.name ?? detail.question} />
              <SummaryRow
                label="Direction"
                value={selectedDirection.toUpperCase()}
                valueColor={selectedDirection === "yes" ? T.green : T.red}
              />
              <SummaryRow label="Price" value={`${priceCents}¢`} />
              <SummaryRow label="Amount" value={usd(dollars)} />
              <SummaryRow
                label="Max payout"
                value={usd(calc.payout)}
                valueColor={T.green}
              />
            </div>
            <button
              type="button"
              disabled={placeOrder.isPending}
              onClick={submit}
              style={{
                marginTop: 14,
                width: "100%",
                height: 48,
                background: T.green,
                border: "none",
                borderRadius: 8,
                color: T.bgPrimary,
                fontSize: 14,
                fontWeight: 500,
                cursor: placeOrder.isPending ? "wait" : "pointer",
                opacity: placeOrder.isPending ? 0.7 : 1,
                fontFamily: T.font,
              }}
            >
              {placeOrder.isPending ? "Placing order…" : "Confirm Order"}
            </button>
            <button
              type="button"
              onClick={() => setReviewing(false)}
              style={{
                marginTop: 10,
                width: "100%",
                background: "none",
                border: "none",
                color: T.textMuted,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              Back
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {/* BUY / SELL tabs */}
            <div
              style={{
                display: "flex",
                borderBottom: T.hairline(),
                margin: "-20px -20px 16px",
              }}
            >
              {(["buy", "sell"] as const).map((t) => {
                const active = tab === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={t === "sell" ? handleSellTab : () => setTab("buy")}
                    style={{
                      flex: 1,
                      height: 36,
                      background: active ? T.bgTertiary : "transparent",
                      border: "none",
                      color: active ? T.textPrimary : T.textMuted,
                      fontSize: 13,
                      fontWeight: active ? 500 : 400,
                      cursor: "pointer",
                      textTransform: "capitalize",
                      fontFamily: T.font,
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            {detail.outcomes.length > 1 ? (
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <OutcomeAvatar
                    ticker={outcome?.ticker ?? detail.ticker}
                    name={outcome?.name ?? detail.question}
                    category={detail.category}
                    imageUrl={outcome?.imageUrl}
                    size={32}
                  />
                  <span
                    style={{
                      color: T.textPrimary,
                      fontSize: 14,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {outcome?.name ?? detail.question}
                  </span>
                </div>
                <select
                  value={outcome?.ticker}
                  onChange={(e) => onSelectOutcome(e.target.value)}
                  aria-label="Outcome"
                  style={{
                    width: "100%",
                    height: 40,
                    background: T.bgTertiary,
                    border: T.hairline(),
                    borderRadius: 8,
                    color: T.textPrimary,
                    fontSize: 13,
                    padding: "0 10px",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: T.font,
                  }}
                >
                  {detail.outcomes.map((o) => (
                    <option key={o.ticker} value={o.ticker}>
                      {o.name} — {o.yesPrice}¢
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <OutcomeAvatar
                  ticker={detail.ticker}
                  name={detail.question}
                  category={detail.category}
                  imageUrl={detail.outcomes[0]?.imageUrl}
                  size={32}
                />
                <span
                  style={{
                    color: T.textPrimary,
                    fontSize: 14,
                    fontWeight: 500,
                    lineHeight: 1.35,
                  }}
                >
                  {detail.question}
                </span>
              </div>
            )}

            {/* YES / NO selection */}
            <div style={{ display: "flex", gap: 8 }}>
              <DirectionButton
                label="Yes"
                price={yesPrice}
                selected={selectedDirection === "yes"}
                tone="yes"
                onClick={() => onSelectDirection("yes")}
              />
              <DirectionButton
                label="No"
                price={noPrice}
                selected={selectedDirection === "no"}
                tone="no"
                onClick={() => onSelectDirection("no")}
              />
            </div>

            {/* Dollar input */}
            <div style={{ marginTop: 16 }}>
              <div style={{ color: T.textSecondary, fontSize: 11, marginBottom: 6 }}>
                Dollars
              </div>
              <div
                style={{
                  background: T.bgTertiary,
                  border: T.hairline(),
                  borderRadius: 8,
                  height: 48,
                  padding: "0 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ color: T.textMuted, fontSize: 14 }}>$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="order-amount-input"
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: T.textPrimary,
                    fontSize: 20,
                    fontWeight: 500,
                    fontFamily: T.font,
                  }}
                />
              </div>
              <div style={{ color: T.textMuted, fontSize: 11, marginTop: 6 }}>
                Predictions account · {usd(balance)} available
              </div>
            </div>

            {/* Calculated values */}
            <div
              style={{
                marginTop: 12,
                background: T.bgTertiary,
                border: T.hairline(),
                borderRadius: 8,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <SummaryRow
                label="Odds"
                value={`${calc.probability}% implied`}
              />
              <SummaryRow
                label="Max payout"
                value={dollars > 0 ? usd(calc.payout) : "—"}
              />
              <div style={{ color: T.textMuted, fontSize: 11 }}>
                Resolves {formatExpiryExact(detail.expiry)}
              </div>
            </div>

            {/* Review button */}
            <button
              type="button"
              disabled={!canReview}
              onClick={() => setReviewing(true)}
              style={{
                marginTop: 16,
                width: "100%",
                height: 48,
                background: canReview ? T.green : T.bgTertiary,
                border: canReview ? "none" : T.hairline(),
                borderRadius: 8,
                color: canReview ? T.bgPrimary : T.textMuted,
                fontSize: 14,
                fontWeight: 500,
                cursor: canReview ? "pointer" : "default",
                transition: `background ${T.transition}`,
                fontFamily: T.font,
              }}
            >
              {selectedDirection === "yes" ? "Review Buy" : "Review No"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DirectionButton({
  label,
  price,
  selected,
  tone,
  onClick,
}: {
  label: string;
  price: number;
  selected: boolean;
  tone: "yes" | "no";
  onClick: () => void;
}) {
  const isYes = tone === "yes";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        height: 52,
        borderRadius: 8,
        cursor: "pointer",
        background: selected
          ? isYes
            ? "rgba(0,232,122,0.12)"
            : "rgba(239,68,68,0.1)"
          : T.bgTertiary,
        border: selected
          ? `1.5px solid ${isYes ? T.green : T.red}`
          : T.hairline(),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        transition: `border-color ${T.transition}, background ${T.transition}`,
        fontFamily: T.font,
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: selected ? (isYes ? T.green : T.red) : T.textMuted,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: T.textPrimary,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {price}¢
      </span>
    </button>
  );
}

function SummaryRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: T.textSecondary, fontSize: 13 }}>{label}</span>
      <span
        style={{
          color: valueColor ?? T.textPrimary,
          fontSize: 13,
          textAlign: "right",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 220,
        }}
      >
        {value}
      </span>
    </div>
  );
}
