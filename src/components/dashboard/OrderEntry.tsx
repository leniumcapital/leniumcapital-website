"use client";

import { useState } from "react";
import { toast } from "sonner";
import { IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";
import { useMarketStore } from "@/stores/marketStore";
import { useAccountStore } from "@/stores/accountStore";
import {
  usePlaceOrder,
  useClosePosition,
  usePositionForMarket,
} from "@/hooks/usePositions";
import { computedPnl, computedPnlPercent } from "@/stores/positionStore";
import { TIERS } from "@/lib/data";
import { T } from "@/lib/tokens";

interface OrderEntryProps {
  ticker: string;
}

export function OrderEntry({ ticker }: OrderEntryProps) {
  const market = useMarketStore(
    useShallow((s) => {
      const m = s.markets[ticker];
      return m
        ? {
            question: m.question,
            category: m.category,
            yesPrice: m.yesPrice,
            noPrice: m.noPrice,
          }
        : null;
    }),
  );
  const tierSize = useAccountStore((s) => s.tier);
  const dailyLockout = useAccountStore((s) => s.dailyLockout);

  const [direction, setDirection] = useState<"yes" | "no">("yes");
  const [size, setSize] = useState(0);

  const placeOrder = usePlaceOrder();
  const closePosition = useClosePosition();
  const position = usePositionForMarket(ticker);

  const tier = TIERS.find((t) => t.size === tierSize);
  const maxPosition = tier
    ? Math.round((tier.size * tier.maxPositionPct) / 100)
    : 0;

  if (!market) return null;

  const entryPrice = direction === "yes" ? market.yesPrice : market.noPrice;
  const potentialProfit =
    entryPrice > 0 ? (size / entryPrice) * 100 - size : 0;

  function handleSizeInput(raw: number) {
    if (!Number.isFinite(raw) || raw < 0) {
      setSize(0);
      return;
    }
    if (maxPosition > 0 && raw > maxPosition) {
      setSize(maxPosition);
      toast(
        `Max position size for your $${tierSize.toLocaleString()} tier is $${maxPosition.toLocaleString()} — capped automatically.`,
      );
      return;
    }
    setSize(raw);
  }

  function handleSubmit() {
    if (!market || size <= 0 || placeOrder.isPending || dailyLockout) return;
    placeOrder.mutate({
      marketTicker: ticker,
      direction,
      size,
      question: market.question,
      category: market.category,
    });
  }

  const confirmDisabled = size <= 0 || placeOrder.isPending || dailyLockout;

  return (
    <div style={{ padding: 20, fontFamily: T.font }}>
      {/* YES / NO toggle */}
      <div
        style={{
          display: "flex",
          border: T.hairline(),
          borderRadius: T.radius,
          overflow: "hidden",
        }}
      >
        <ToggleButton
          label="YES"
          price={market.yesPrice}
          active={direction === "yes"}
          side="yes"
          onClick={() => setDirection("yes")}
        />
        <div style={{ width: 0.5, background: T.border }} />
        <ToggleButton
          label="NO"
          price={market.noPrice}
          active={direction === "no"}
          side="no"
          onClick={() => setDirection("no")}
        />
      </div>

      {/* Amount */}
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span style={{ color: T.textMuted, fontSize: 12 }}>Amount</span>
          <span style={{ color: T.textMuted, fontSize: 12 }}>
            Max: ${maxPosition.toLocaleString()}
          </span>
        </div>
        <div
          style={{
            background: T.bgTertiary,
            border: T.hairline(),
            borderRadius: T.radius,
            height: 48,
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: T.textMuted, fontSize: 14 }}>$</span>
          <input
            type="number"
            value={size === 0 ? "" : size}
            min={0}
            max={maxPosition}
            placeholder="0"
            onChange={(e) => handleSizeInput(Number(e.target.value))}
            className="order-amount-input"
            style={{
              appearance: "textfield",
              background: "transparent",
              border: "none",
              outline: "none",
              color: T.textPrimary,
              fontSize: 20,
              fontWeight: 500,
              flex: 1,
              fontFamily: T.font,
            }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={maxPosition || 100}
          step={10}
          value={Math.min(size, maxPosition || 100)}
          onChange={(e) => handleSizeInput(Number(e.target.value))}
          className="order-size-slider"
          style={{ width: "100%", marginTop: 12 }}
        />
      </div>

      {/* Calculated values */}
      <div
        style={{
          marginTop: 16,
          background: T.bgTertiary,
          border: T.hairline(),
          borderRadius: T.radius,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <CalcRow
          label="Potential profit"
          value={`+$${Math.max(0, potentialProfit).toFixed(2)}`}
          color={T.green}
        />
        <CalcRow label="Max loss" value={`−$${size.toFixed(2)}`} color={T.red} />
        <CalcRow
          label="Implied probability"
          value={`${market.yesPrice}%`}
          color={T.textPrimary}
        />
      </div>

      {/* Confirm */}
      <div
        title={
          dailyLockout
            ? "Daily loss limit reached — trading resumes at midnight UTC"
            : undefined
        }
      >
        <button
          type="button"
          disabled={confirmDisabled}
          onClick={handleSubmit}
          style={{
            marginTop: 16,
            width: "100%",
            height: 48,
            background: T.green,
            border: "none",
            borderRadius: T.radius,
            color: T.bgPrimary,
            fontSize: 14,
            fontWeight: 500,
            cursor: confirmDisabled ? "not-allowed" : "pointer",
            opacity: confirmDisabled ? 0.5 : 1,
            transition: `filter ${T.transition}, transform 100ms ease`,
            fontFamily: T.font,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {placeOrder.isPending
            ? "Placing order…"
            : `Buy ${direction.toUpperCase()} for $${size.toLocaleString()}`}
        </button>
      </div>

      <p
        style={{
          marginTop: 10,
          textAlign: "center",
          color: T.textMuted,
          fontSize: 11,
        }}
      >
        Simulated account — this order mirrors live Kalshi prices.
      </p>

      {/* Open position */}
      {position && (
        <div
          style={{
            background: T.bgTertiary,
            border: T.hairline(),
            borderRadius: T.radius,
            padding: 14,
            marginTop: 16,
          }}
        >
          <div style={{ color: T.textMuted, fontSize: 12, marginBottom: 8 }}>
            Your position
          </div>
          <PositionSummary
            direction={position.direction}
            size={position.size}
            entryPrice={position.entryPrice}
            pnl={computedPnl(position)}
            pnlPercent={computedPnlPercent(position)}
          />
          <button
            type="button"
            disabled={closePosition.isPending}
            onClick={() => closePosition.mutate(position)}
            style={{
              marginTop: 12,
              width: "100%",
              height: 36,
              background: "transparent",
              border: T.hairline(T.red),
              borderRadius: 6,
              color: T.red,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: T.font,
              opacity: closePosition.isPending ? 0.5 : 1,
            }}
          >
            {closePosition.isPending ? "Closing…" : "Close position"}
          </button>
        </div>
      )}
    </div>
  );
}

function ToggleButton({
  label,
  price,
  active,
  side,
  onClick,
}: {
  label: string;
  price: number;
  active: boolean;
  side: "yes" | "no";
  onClick: () => void;
}) {
  const isYes = side === "yes";
  const accent = isYes ? T.green : T.red;
  const activeBg = isYes ? T.greenBtnBg : T.redBtnBg;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 0 8px",
        background: active ? activeBg : isYes ? "rgba(0,232,122,0.04)" : T.redMuted,
        border: "none",
        borderBottom: active
          ? `2px solid ${accent}`
          : `2px solid ${isYes ? T.greenBtnBorder : T.redBtnBorder}`,
        color: accent,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        fontFamily: T.font,
        transition: `background ${T.transition}`,
        opacity: active ? 1 : 0.9,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, opacity: 0.85 }}>{price}¢</span>
    </button>
  );
}

function CalcRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: T.textMuted, fontSize: 13 }}>{label}</span>
      <span
        style={{
          color,
          fontSize: 13,
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PositionSummary({
  direction,
  size,
  entryPrice,
  pnl,
  pnlPercent,
}: {
  direction: "yes" | "no";
  size: number;
  entryPrice: number;
  pnl: number;
  pnlPercent: number;
}) {
  const up = pnl >= 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          background: direction === "yes" ? T.greenMutedBg : T.redMuted,
          border: T.hairline(direction === "yes" ? T.greenMutedBorder : T.red),
          color: direction === "yes" ? T.green : T.red,
          fontSize: 11,
          fontWeight: 600,
          borderRadius: 4,
          padding: "2px 7px",
        }}
      >
        {direction.toUpperCase()}
      </span>
      <span style={{ color: T.textPrimary, fontSize: 13, fontWeight: 500 }}>
        ${size.toLocaleString()}
      </span>
      <span style={{ color: T.textMuted, fontSize: 12 }}>@ {entryPrice}¢</span>
      <span
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 2,
          color: up ? T.green : T.red,
          fontSize: 13,
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {up ? (
          <IconArrowUpRight size={14} stroke={1.5} />
        ) : (
          <IconArrowDownRight size={14} stroke={1.5} />
        )}
        {up ? "+" : "−"}${Math.abs(pnl).toFixed(2)} ({pnlPercent.toFixed(1)}%)
      </span>
    </div>
  );
}
