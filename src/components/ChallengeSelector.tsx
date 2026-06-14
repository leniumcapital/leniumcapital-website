"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useSpring,
  useTransform,
} from "framer-motion";
import { toast, Toaster } from "sonner";
import {
  IconTarget,
  IconTrendingDown,
  IconCalendarOff,
  IconCalendar,
  IconChartPie,
  IconShield,
  IconMapPin,
  IconCreditCard,
  IconCheck,
  IconRefresh,
} from "@tabler/icons-react";
import { T } from "@/lib/tokens";
import {
  TIERS,
  ADDONS,
  SPLIT_ADDON_IDS,
  computePrice,
  addonPrice,
  formatUsd,
  formatPct,
  getTierBySize,
  getDefaultTier,
  parseTierParam,
  parseAddonsParam,
  buildPricingQuery,
  profitNeededUsd,
  safetyLimitUsd,
  resetSavingsUsd,
  challengeWindowDays,
  payoutCycleDays,
  CHALLENGE_WINDOW_DAYS,
  PAYOUT_CYCLE_DAYS,
  type AddonId,
  type PricingTier,
} from "@/lib/pricing";

const PANEL_WIDTH = 320;
const PANEL_GAP = 32;
const CONTENT_PR = PANEL_WIDTH + PANEL_GAP;

type ChallengeSelectorProps = {
  isAuthenticated?: boolean;
};

export function ChallengeSelector({
  isAuthenticated = false,
}: ChallengeSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialTier = parseTierParam(searchParams.get("tier"));
  const initialAddons = parseAddonsParam(searchParams.get("addons"));

  const [selectedSize, setSelectedSize] = useState(initialTier.size);
  const [selectedAddons, setSelectedAddons] =
    useState<AddonId[]>(initialAddons);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const tier = getTierBySize(selectedSize) ?? getDefaultTier();
  const price = useMemo(
    () => computePrice(tier, selectedAddons),
    [tier, selectedAddons],
  );

  const syncUrl = useCallback(
    (size: number, addons: AddonId[]) => {
      const query = buildPricingQuery(size, addons);
      router.replace(`${pathname}?${query}`, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    syncUrl(selectedSize, selectedAddons);
  }, [selectedSize, selectedAddons, syncUrl]);

  const selectTier = (size: number) => setSelectedSize(size);

  const toggleAddon = (id: AddonId) => {
    setSelectedAddons((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);

      let next = [...prev, id];
      if (SPLIT_ADDON_IDS.includes(id)) {
        const other = SPLIT_ADDON_IDS.find((s) => s !== id && prev.includes(s));
        if (other) {
          next = next.filter((x) => x !== other);
          const addon = ADDONS.find((a) => a.id === id);
          if (addon) toast(`Switched to ${addon.name}`);
        }
      }
      return next;
    });
  };

  const handleCheckout = async () => {
    if (isAuthenticated) {
      setCheckingOut(true);
      try {
        const res = await fetch("/api/challenges/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tierSize: tier.size,
            addons: selectedAddons,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          toast.error(data.error ?? "Could not start challenge.");
          return;
        }
        toast.success(`${formatUsd(tier.size)} challenge started — good luck!`);
        router.push("/dashboard");
      } catch {
        toast.error("Something went wrong. Please try again.");
      } finally {
        setCheckingOut(false);
      }
      return;
    }

    const callbackUrl = `${pathname}?${buildPricingQuery(tier.size, selectedAddons)}`;
    router.push(
      `/signup?mode=login&callbackUrl=${encodeURIComponent(callbackUrl)}`,
    );
  };

  const bundleDiscount = price.discountPct > 0;

  return (
    <div
      style={{
        background: T.bgPrimary,
        color: T.textPrimary,
        fontFamily: T.font,
        minHeight: "100%",
      }}
    >
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: T.bgSecondary,
            border: T.hairline(),
            color: T.textPrimary,
            fontFamily: T.font,
          },
        }}
      />

      {/* Section 1 — Header */}
      <header
        style={{
          padding: "80px 24px 48px",
          textAlign: "center",
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        <span
          style={{
            display: "inline-block",
            background: T.greenMutedBg,
            border: T.hairline(T.greenMutedBorder),
            color: T.green,
            borderRadius: T.radiusPill,
            padding: "4px 14px",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          Build your challenge
        </span>
        <h1
          style={{
            marginTop: 20,
            fontSize: 42,
            fontWeight: 500,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          Nine sizes. One process. Your capital.
        </h1>
        <p
          style={{
            marginTop: 16,
            fontSize: 16,
            color: T.textMuted,
            lineHeight: 1.5,
          }}
        >
          Pick a size, configure your add-ons, and see exactly what you pay —
          before you commit.
        </p>
      </header>

      {/* Main layout with room for sticky panel */}
      <div
        className="challenge-selector-main"
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "0 24px 120px",
        }}
      >
        {/* Section 2 — Tier selector */}
        <section aria-label="Challenge tier selection">
          <TierTabs
            tiers={TIERS}
            selectedSize={selectedSize}
            onSelect={selectTier}
          />

          <div style={{ marginTop: 16 }}>
            <AnimatePresence mode="wait">
              <TierDetailCard key={tier.size} tier={tier} />
            </AnimatePresence>
          </div>
        </section>

        {/* Section 3 — Add-ons */}
        <section style={{ marginTop: 48 }} aria-label="Challenge add-ons">
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>
              Customize your challenge
            </h2>
            <span style={{ fontSize: 13, color: T.textMuted }}>
              Optional add-ons — saved automatically
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ADDONS.map((addon) => (
              <AddonCard
                key={addon.id}
                addon={addon}
                baseFee={tier.fee}
                selected={selectedAddons.includes(addon.id)}
                onToggle={() => toggleAddon(addon.id)}
              />
            ))}
          </div>

          <AnimatePresence>
            {bundleDiscount && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 14,
                  background: T.greenMutedBg,
                  border: T.hairline(T.greenMutedBorder),
                  borderRadius: T.radiusPill,
                  padding: "6px 14px",
                  fontSize: 13,
                  color: T.green,
                  fontWeight: 500,
                }}
              >
                <IconCheck size={14} aria-hidden />
                Bundle discount applied — {Math.round(price.discountPct * 100)}%
                off add-ons
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      {/* Desktop sticky order summary */}
      <div className="challenge-selector-panel-desktop">
        <OrderSummaryPanel
          tier={tier}
          price={price}
          selectedAddons={selectedAddons}
          onCheckout={handleCheckout}
          checkingOut={checkingOut}
        />
      </div>

      {/* Mobile bottom bar + sheet */}
      <MobileOrderBar
        total={price.total}
        onCheckout={handleCheckout}
        checkingOut={checkingOut}
        sheetOpen={mobileSheetOpen}
        onToggleSheet={() => setMobileSheetOpen((o) => !o)}
        onCloseSheet={() => setMobileSheetOpen(false)}
        panel={
          <OrderSummaryPanel
            tier={tier}
            price={price}
            selectedAddons={selectedAddons}
            onCheckout={handleCheckout}
            checkingOut={checkingOut}
            embedded
          />
        }
      />

      <style jsx global>{`
        .challenge-selector-main {
          padding-right: 24px;
        }
        @media (min-width: 768px) {
          .challenge-selector-main {
            padding-right: ${CONTENT_PR}px;
          }
        }
        .challenge-selector-panel-desktop {
          display: none;
        }
        @media (min-width: 768px) {
          .challenge-selector-panel-desktop {
            display: block;
            position: fixed;
            top: 80px;
            right: max(24px, calc((100vw - 1120px) / 2 + 24px));
            width: ${PANEL_WIDTH}px;
            z-index: 40;
          }
        }
        .tier-tabs-scroll::-webkit-scrollbar {
          display: none;
        }
        .tier-tabs-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

function TierTabs({
  tiers,
  selectedSize,
  onSelect,
}: {
  tiers: PricingTier[];
  selectedSize: number;
  onSelect: (size: number) => void;
}) {
  const tabRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = tiers[Math.min(idx + 1, tiers.length - 1)];
      onSelect(next.size);
      tabRefs.current.get(next.size)?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = tiers[Math.max(idx - 1, 0)];
      onSelect(prev.size);
      tabRefs.current.get(prev.size)?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Account size tiers"
      className="tier-tabs-scroll"
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        scrollSnapType: "x mandatory",
        paddingBottom: 4,
      }}
    >
      {tiers.map((t, idx) => {
        const active = t.size === selectedSize;
        return (
          <button
            key={t.size}
            ref={(el) => {
              if (el) tabRefs.current.set(t.size, el);
            }}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`${formatUsd(t.size)} account, from ${formatUsd(t.fee)}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(t.size)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            style={{
              position: "relative",
              flex: "0 0 auto",
              minWidth: 110,
              height: 64,
              padding: "0 16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              background: active ? "rgba(0,232,122,0.05)" : T.bgSecondary,
              border: active
                ? "0.5px solid rgba(0,232,122,0.5)"
                : T.hairline(),
              borderRadius: 8,
              cursor: "pointer",
              transition: T.transition,
              scrollSnapAlign: "start",
              textAlign: "left",
            }}
          >
            {active && (
              <motion.div
                layoutId="activeTab"
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: T.green,
                  borderRadius: "2px 2px 0 0",
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <span
              style={{
                fontSize: 15,
                fontWeight: active ? 600 : 500,
                color: T.textPrimary,
              }}
            >
              {formatUsd(t.size)}
            </span>
            <span style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
              from {formatUsd(t.fee)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TierDetailCard({ tier }: { tier: PricingTier }) {
  const profitPct = tier.profitTarget * 100;
  const profitGoal = profitNeededUsd(tier);
  const safety = safetyLimitUsd(tier);
  const savings = resetSavingsUsd(tier);

  const rules = [
    {
      icon: IconTarget,
      label: "Profit target",
      value: formatPct(tier.profitTarget),
    },
    {
      icon: IconTrendingDown,
      label: "Max drawdown",
      value: formatPct(tier.maxDrawdown),
    },
    {
      icon: IconCalendarOff,
      label: "Daily loss limit",
      value: formatPct(tier.dailyLossLimit),
    },
    {
      icon: IconCalendar,
      label: "Min trading days",
      value: String(tier.minTradingDays),
    },
    {
      icon: IconChartPie,
      label: "Max position size",
      value: formatPct(tier.maxPositionSize),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.99 }}
      transition={{
        duration: 0.2,
        ease: "easeOut",
      }}
      style={{
        background: T.bgSecondary,
        border: T.hairline(),
        borderRadius: 12,
        padding: 40,
      }}
    >
      <div
        className="tier-detail-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 48,
        }}
      >
        {/* Left column */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 48, fontWeight: 600 }}>
              {formatUsd(tier.size)}
            </span>
            {tier.popular && (
              <span
                style={{
                  background: "rgba(0,232,122,0.1)",
                  border: T.hairline(T.greenMutedBorder),
                  color: T.green,
                  borderRadius: T.radiusPill,
                  padding: "4px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Most Popular
              </span>
            )}
          </div>

          <div style={{ marginTop: 28 }}>
            {rules.map((rule) => (
              <RuleRow
                key={rule.label}
                icon={rule.icon}
                label={rule.label}
                value={rule.value}
              />
            ))}
            <RuleRow
              icon={IconRefresh}
              label={`Restart from ${formatUsd(tier.resetFee)} (save ${formatUsd(savings)} vs buying fresh)`}
              value=""
              hideValue
            />
          </div>
        </div>

        {/* Right column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <ProfitRing percent={profitPct} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              width: "100%",
              marginTop: 28,
            }}
          >
            <StatBox
              value={formatUsd(profitGoal)}
              label="to pass"
              accent
            />
            <StatBox value={formatUsd(safety)} label="max drawdown" />
          </div>
          <div style={{ width: "100%", marginTop: 20 }}>
            <RuleRow
              icon={IconCalendar}
              label="Challenge window"
              value={`${CHALLENGE_WINDOW_DAYS} days`}
            />
            <RuleRow
              icon={IconCreditCard}
              label="Payout cycle"
              value={`${PAYOUT_CYCLE_DAYS} days`}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (min-width: 768px) {
          .tier-detail-grid {
            grid-template-columns: 55% 45% !important;
          }
        }
      `}</style>
    </motion.div>
  );
}

function RuleRow({
  icon: Icon,
  label,
  value,
  hideValue,
}: {
  icon: React.ComponentType<{ size?: number; stroke?: number; color?: string }>;
  label: string;
  value: string;
  hideValue?: boolean;
}) {
  return (
    <div
      style={{
        height: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: T.hairline(),
        padding: "0 4px",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: T.textSecondary,
          fontSize: 14,
          flex: 1,
          minWidth: 0,
        }}
      >
        <Icon size={16} stroke={1.5} color={T.textMuted} aria-hidden />
        <span style={{ lineHeight: 1.3 }}>{label}</span>
      </div>
      {!hideValue && (
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: T.textPrimary,
            flexShrink: 0,
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function ProfitRing({ percent }: { percent: number }) {
  const size = 200;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-hidden
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1C1C1C"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={T.green}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 400ms ease-in-out" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 600 }}>{percent}%</div>
        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
          profit target
        </div>
      </div>
    </div>
  );
}

function StatBox({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: "#0D0D0D",
        border: T.hairline(),
        borderRadius: 8,
        padding: 16,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 20,
          fontWeight: 500,
          color: accent ? T.green : T.textPrimary,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

function AddonToggle({ on }: { on: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: on ? T.green : "#1C1C1C",
        position: "relative",
        flexShrink: 0,
        transition: `background ${T.transition}`,
      }}
    >
      <motion.div
        animate={{ x: on ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          position: "absolute",
          top: 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#FFFFFF",
        }}
      />
    </div>
  );
}

function AddonCard({
  addon,
  baseFee,
  selected,
  onToggle,
}: {
  addon: (typeof ADDONS)[number];
  baseFee: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const price = addonPrice(addon, baseFee);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      role="switch"
      aria-checked={selected}
      aria-label={`${addon.name}, ${selected ? "enabled" : "disabled"}, +${formatUsd(price)}`}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      style={{
        width: "100%",
        background: selected ? "rgba(0,232,122,0.04)" : T.bgSecondary,
        border: selected
          ? "0.5px solid rgba(0,232,122,0.4)"
          : T.hairline(),
        borderRadius: 10,
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 20,
        cursor: "pointer",
        transition: T.transition,
      }}
      onMouseEnter={(e) => {
        if (!selected)
          e.currentTarget.style.borderColor = T.borderHover;
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.borderColor = T.border;
      }}
    >
      <AddonToggle on={selected} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          {addon.name}
          {addon.badge && (
            <span style={{ color: T.green, fontSize: 12 }}>{addon.badge}</span>
          )}
        </div>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 13,
            color: T.textMuted,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {addon.description}
        </p>
      </div>
      <span style={{ fontSize: 15, fontWeight: 500, flexShrink: 0 }}>
        +{formatUsd(price)}
      </span>
    </div>
  );
}

function AnimatedTotal({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 200, damping: 25 });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  const display = useTransform(spring, (v) =>
    `$${Math.round(v).toLocaleString("en-US")}`,
  );

  return (
    <motion.span style={{ fontSize: 24, fontWeight: 600 }}>{display}</motion.span>
  );
}

function OrderSummaryPanel({
  tier,
  price,
  selectedAddons,
  onCheckout,
  checkingOut,
  embedded,
}: {
  tier: PricingTier;
  price: ReturnType<typeof computePrice>;
  selectedAddons: AddonId[];
  onCheckout: () => void;
  checkingOut: boolean;
  embedded?: boolean;
}) {
  const profitGoal = profitNeededUsd(tier);
  const windowDays = challengeWindowDays(selectedAddons);
  const payoutDays = payoutCycleDays(selectedAddons);

  return (
    <aside
      aria-label="Order summary"
      style={{
        background: T.bgSecondary,
        border: embedded ? "none" : T.hairline(),
        borderRadius: embedded ? 0 : 12,
        padding: embedded ? "0 0 16px" : 24,
      }}
    >
      <div style={{ fontSize: 14, color: T.textPrimary }}>
        {formatUsd(tier.size)} evaluation account
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginTop: 16,
          fontSize: 13,
        }}
      >
        <SummaryRow label="Base challenge fee" value={formatUsd(price.baseFee)} />
        {price.addonLines.map((line) => (
          <SummaryRow
            key={line.id}
            label={line.name}
            value={`+${formatUsd(line.price)}`}
          />
        ))}
        {price.discount > 0 && (
          <SummaryRow
            label={`Bundle discount (${Math.round(price.discountPct * 100)}%)`}
            value={`-${formatUsd(price.discount)}`}
            accent
          />
        )}
      </div>

      <div
        style={{
          borderTop: T.hairline(),
          marginTop: 16,
          paddingTop: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500 }}>Total today</span>
        <AnimatedTotal value={price.total} />
      </div>

      <div
        style={{
          marginTop: 12,
          background: "rgba(0,232,122,0.08)",
          border: T.hairline(T.greenMutedBorder),
          borderRadius: 8,
          padding: 12,
          fontSize: 13,
          lineHeight: 1.45,
        }}
      >
        Hit your {formatUsd(profitGoal)} profit goal to get funded with{" "}
        {formatUsd(tier.size)} in capital
      </div>

      {!embedded && (
        <>
          <button
            type="button"
            onClick={onCheckout}
            disabled={checkingOut}
            style={{
              width: "100%",
              height: 48,
              marginTop: 16,
              background: T.green,
              border: "none",
              borderRadius: 8,
              color: T.bgPrimary,
              fontSize: 15,
              fontWeight: 600,
              cursor: checkingOut ? "wait" : "pointer",
              fontFamily: T.font,
              transition: T.transition,
              opacity: checkingOut ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!checkingOut) e.currentTarget.style.filter = "brightness(0.9)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = "none";
            }}
          >
            Start {formatUsd(price.total)} challenge
          </button>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginTop: 16,
            }}
          >
            <TrustSignal icon={IconShield} text="CFTC-regulated through Kalshi" />
            <TrustSignal
              icon={IconMapPin}
              text="Available in all 50 US states"
            />
            <TrustSignal
              icon={IconCreditCard}
              text="One-time fee — no subscriptions"
            />
          </div>

          <p
            style={{
              marginTop: 12,
              fontSize: 11,
              color: T.textMuted,
              textAlign: "center",
            }}
          >
            Free to create an account — you only pay when you start.
          </p>
        </>
      )}

      {embedded && (
        <div style={{ marginTop: 12, fontSize: 12, color: T.textMuted }}>
          {windowDays}-day challenge window · {payoutDays}-day payout cycle
        </div>
      )}
    </aside>
  );
}

function SummaryRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
      <span style={{ color: T.textSecondary }}>{label}</span>
      <span style={{ color: accent ? T.green : T.textPrimary }}>{value}</span>
    </div>
  );
}

function TrustSignal({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ size?: number; stroke?: number; color?: string }>;
  text: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        color: T.textMuted,
      }}
    >
      <Icon size={14} stroke={1.5} color={T.textMuted} aria-hidden />
      <span>{text}</span>
    </div>
  );
}

function MobileOrderBar({
  total,
  onCheckout,
  checkingOut,
  sheetOpen,
  onToggleSheet,
  onCloseSheet,
  panel,
}: {
  total: number;
  onCheckout: () => void;
  checkingOut: boolean;
  sheetOpen: boolean;
  onToggleSheet: () => void;
  onCloseSheet: () => void;
  panel: React.ReactNode;
}) {
  return (
    <>
      <div
        className="challenge-mobile-bar"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          background: T.bgSecondary,
          borderTop: T.hairline(),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          zIndex: 50,
          fontFamily: T.font,
        }}
      >
        <button
          type="button"
          onClick={onToggleSheet}
          aria-expanded={sheetOpen}
          aria-label="Expand order summary"
          style={{
            background: "none",
            border: "none",
            color: T.textPrimary,
            textAlign: "left",
            cursor: "pointer",
            padding: "8px 0",
          }}
        >
          <div style={{ fontSize: 12, color: T.textMuted }}>Total today</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>
            {formatUsd(total)}
          </div>
        </button>
        <button
          type="button"
          onClick={onCheckout}
          disabled={checkingOut}
          style={{
            height: 44,
            padding: "0 20px",
            background: T.green,
            border: "none",
            borderRadius: 8,
            color: T.bgPrimary,
            fontSize: 14,
            fontWeight: 600,
            cursor: checkingOut ? "wait" : "pointer",
            fontFamily: T.font,
          }}
        >
          Start {formatUsd(total)} challenge
        </button>
      </div>

      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseSheet}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(10,10,10,0.6)",
                zIndex: 60,
              }}
              aria-hidden
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 36 }}
              role="dialog"
              aria-label="Order summary"
              style={{
                position: "fixed",
                bottom: 80,
                left: 0,
                right: 0,
                maxHeight: "70vh",
                overflowY: "auto",
                background: T.bgSecondary,
                borderTop: T.hairline(),
                borderRadius: "12px 12px 0 0",
                padding: 24,
                zIndex: 70,
                fontFamily: T.font,
              }}
            >
              {panel}
              <button
                type="button"
                onClick={onCheckout}
                disabled={checkingOut}
                style={{
                  width: "100%",
                  height: 48,
                  marginTop: 16,
                  background: T.green,
                  border: "none",
                  borderRadius: 8,
                  color: T.bgPrimary,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: T.font,
                }}
              >
                Start {formatUsd(total)} challenge
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .challenge-mobile-bar {
          display: flex;
        }
        @media (min-width: 768px) {
          .challenge-mobile-bar {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
