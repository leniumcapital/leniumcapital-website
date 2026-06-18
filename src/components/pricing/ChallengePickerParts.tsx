"use client";

import { motion } from "framer-motion";
import type { KeyboardEvent } from "react";
import {
  TIERS,
  ADDONS,
  formatTierCompact,
  formatUsd,
  addonPrice,
} from "@/lib/pricing";

const TIER_HIGHLIGHT_ID = "pricing-tier-highlight";

export function TierPillGrid({
  selectedSize,
  onSelect,
  compact = false,
}: {
  selectedSize: number;
  onSelect: (size: number) => void;
  /** Compact 3×2 grid for marketing embeds; default matches /pricing layout. */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className="grid grid-cols-3 gap-1.5"
        role="tablist"
        aria-label="Account size tiers"
      >
        {TIERS.map((t) => {
          const active = t.size === selectedSize;
          return (
            <button
              key={t.size}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(t.size)}
              className="relative flex h-8 items-center justify-center rounded-[7px] border border-border bg-[#161616] text-[11px] font-semibold text-[#777777]"
            >
              {active && (
                <motion.span
                  layoutId={TIER_HIGHLIGHT_ID}
                  className="absolute inset-0 rounded-[7px] bg-brand"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <span
                className={`relative z-10 tabular-nums ${active ? "font-bold text-[#0A0A0A]" : ""}`}
              >
                {formatTierCompact(t.size)}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      role="tablist"
      aria-label="Account size tiers"
    >
      {TIERS.map((t) => {
        const active = t.size === selectedSize;
        return (
          <button
            key={t.size}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`${formatUsd(t.size)}, ${formatUsd(t.fee)}`}
            onClick={() => onSelect(t.size)}
            className={`relative rounded-xl border px-3 py-3 text-center transition-colors ${
              active
                ? "border-transparent bg-transparent"
                : "border-border bg-background hover:border-brand/40"
            }`}
          >
            {active && (
              <motion.span
                layoutId={TIER_HIGHLIGHT_ID}
                className="absolute inset-0 rounded-xl border border-brand bg-brand-soft"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            {t.popular && (
              <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#04130b]">
                Popular
              </span>
            )}
            <div className="relative z-10 text-base font-semibold tracking-tight tabular-nums">
              {formatTierCompact(t.size)}
            </div>
            <div className="relative z-10 mt-0.5 text-xs tabular-nums text-muted">
              {formatUsd(t.fee)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function AddonRow({
  addon,
  baseFee,
  selected,
  onToggle,
  compact,
}: {
  addon: (typeof ADDONS)[number];
  baseFee: number;
  selected: boolean;
  onToggle: () => void;
  /** Hide long description for compact marketing embeds. */
  compact?: boolean;
}) {
  const linePrice = addonPrice(addon, baseFee);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={selected}
      aria-label={`${addon.name}, +${formatUsd(linePrice)}`}
      onClick={onToggle}
      onKeyDown={onKeyDown}
      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
        selected
          ? "border-brand bg-brand-soft"
          : "border-border bg-background hover:border-brand/40"
      } ${compact ? "!p-3" : ""}`}
    >
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border ${
          selected
            ? "border-brand bg-brand text-[#04130b]"
            : "border-border bg-surface"
        }`}
        aria-hidden
      >
        {selected && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className={`font-medium ${compact ? "text-sm" : ""}`}>
            {addon.name}
            {addon.badge && (
              <span className="ml-1 text-brand-strong">{addon.badge}</span>
            )}
          </span>
          <span className="shrink-0 font-semibold tabular-nums">
            +{formatUsd(linePrice)}
          </span>
        </span>
        {!compact && (
          <span className="mt-1 block text-sm text-muted">{addon.description}</span>
        )}
      </span>
    </button>
  );
}

export function PricingTotalBar({ total }: { total: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-foreground px-3 py-3 text-background">
      <span className="text-sm">Total today</span>
      <span className="font-semibold tabular-nums">{formatUsd(total)}</span>
    </div>
  );
}
