"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconArrowLeft,
  IconFlask,
  IconRocket,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { LeniumMark } from "@/components/ui/LeniumLogo";
import { useUiStore } from "@/stores/uiStore";
import { useAccountStore } from "@/stores/accountStore";
import { useChallengeStore } from "@/stores/challengeStore";
import {
  TIERS,
  ADDONS,
  computePrice,
  usd,
  CHALLENGE_WINDOW_DAYS,
  type AddonId,
} from "@/lib/data";
import { T } from "@/lib/tokens";

const ONBOARDING_DONE_KEY = "lenium_onboarding_done";

type Step = "mode" | "demo" | "live";

export function markOnboardingDone(): void {
  try {
    sessionStorage.setItem(ONBOARDING_DONE_KEY, "1");
  } catch {
    // ignore
  }
}

export function isOnboardingDone(): boolean {
  try {
    return sessionStorage.getItem(ONBOARDING_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function DashboardOnboardingModal() {
  const open = useUiStore((s) => s.onboardingOpen);
  const close = useUiStore((s) => s.closeOnboarding);

  return (
    <AnimatePresence>
      {open && <Panel onClose={close} />}
    </AnimatePresence>
  );
}

function Panel({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("mode");

  function handleClose() {
    markOnboardingDone();
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,10,0.85)",
        backdropFilter: "blur(6px)",
        zIndex: 150,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: T.font,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: step === "live" ? 560 : 520,
          maxHeight: "min(90vh, 720px)",
          background: T.bgSecondary,
          border: T.hairline(),
          borderRadius: 14,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <ModalHeader
          step={step}
          onBack={step !== "mode" ? () => setStep("mode") : undefined}
          onClose={handleClose}
        />

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 32px 32px" }}>
          {step === "mode" && <ModeStep onSelect={setStep} />}
          {step === "demo" && <DemoStep onComplete={handleClose} />}
          {step === "live" && <LiveStep onComplete={handleClose} />}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ModalHeader({
  step,
  onBack,
  onClose,
}: {
  step: Step;
  onBack?: () => void;
  onClose: () => void;
}) {
  const title =
    step === "mode"
      ? "Welcome to Lenium"
      : step === "demo"
        ? "Choose your demo account"
        : "Choose your plan";

  const subtitle =
    step === "mode"
      ? "How would you like to start?"
      : step === "demo"
        ? "Practice with simulated funds on live Kalshi prices"
        : "Pick your account size and add-ons";

  return (
    <div
      style={{
        padding: "24px 32px 16px",
        borderBottom: T.hairline(),
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {onBack && (
          <button
            type="button"
            aria-label="Back"
            onClick={onBack}
            style={{
              marginTop: 4,
              background: T.bgTertiary,
              border: T.hairline(),
              borderRadius: T.radius,
              width: 32,
              height: 32,
              display: "grid",
              placeItems: "center",
              color: T.textMuted,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <IconArrowLeft size={16} stroke={1.5} />
          </button>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LeniumMark size={28} variant="green" />
            <h2
              id="onboarding-title"
              style={{
                margin: 0,
                color: T.textPrimary,
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              {title}
            </h2>
          </div>
          <p
            style={{
              margin: "8px 0 0",
              color: T.textMuted,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        </div>

        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            background: T.bgTertiary,
            border: T.hairline(),
            borderRadius: T.radius,
            width: 32,
            height: 32,
            display: "grid",
            placeItems: "center",
            color: T.textMuted,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <IconX size={16} stroke={1.5} />
        </button>
      </div>
    </div>
  );
}

function ModeStep({ onSelect }: { onSelect: (step: Step) => void }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 12,
        marginTop: 8,
      }}
    >
      <ModeCard
        icon={<IconFlask size={22} stroke={1.5} />}
        title="Demo"
        description="Simulated account with live market prices. No payment required."
        accent={T.amber}
        accentBg="rgba(245,158,11,0.1)"
        accentBorder="rgba(245,158,11,0.35)"
        onClick={() => onSelect("demo")}
      />
      <ModeCard
        icon={<IconRocket size={22} stroke={1.5} />}
        title="Live"
        description="Start a real evaluation challenge. Pass to unlock your funded account."
        accent={T.green}
        accentBg={T.greenMutedBg}
        accentBorder={T.greenMutedBorder}
        onClick={() => onSelect("live")}
      />
    </div>
  );
}

function ModeCard({
  icon,
  title,
  description,
  accent,
  accentBg,
  accentBorder,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 12,
        padding: 20,
        borderRadius: T.radiusLg,
        border: `0.5px solid ${accentBorder}`,
        background: accentBg,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: T.font,
        transition: `border-color ${T.transition}`,
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 40,
          height: 40,
          borderRadius: T.radius,
          background: T.bgTertiary,
          border: T.hairline(),
          color: accent,
        }}
      >
        {icon}
      </span>
      <span style={{ color: T.textPrimary, fontSize: 16, fontWeight: 600 }}>
        {title}
      </span>
      <span style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.55 }}>
        {description}
      </span>
    </button>
  );
}

function DemoStep({ onComplete }: { onComplete: () => void }) {
  const { update } = useSession();
  const setAccount = useAccountStore((s) => s.setAccount);
  const applyAccountStatus = useAccountStore((s) => s.applyAccountStatus);
  const resetChallenge = useChallengeStore((s) => s.reset);

  const defaultIdx = TIERS.findIndex((t) => t.size === 25_000);
  const [tierIdx, setTierIdx] = useState(defaultIdx >= 0 ? defaultIdx : 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tier = TIERS[tierIdx];

  async function handleStart() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/challenges/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierSize: tier.size, addons: [] }),
      });
      const data = (await res.json()) as {
        error?: string;
        tier?: number;
        balance?: number;
      };

      if (!res.ok) {
        setError(data.error ?? "Could not start demo account.");
        return;
      }

      setAccount({
        accountType: "challenge",
        challengeStatus: "active",
        tier: data.tier!,
        balance: data.balance!,
        accountSize: data.tier!,
      });
      applyAccountStatus({
        hasActiveChallenge: true,
        challengeTier: data.tier!,
        challengeBalance: data.balance!,
        tradingMode: "demo",
      });

      resetChallenge();

      await update({
        tier: data.tier,
        balance: data.balance,
        accountType: "challenge",
        challengeStatus: "in_progress",
      });

      toast.success(`${usd(data.tier!)} demo account ready — start trading!`);
      markOnboardingDone();
      onComplete();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <ErrorBanner message={error} />}

      <SectionLabel>Account size</SectionLabel>
      <TierGrid tierIdx={tierIdx} onSelect={setTierIdx} />

      <div
        style={{
          marginTop: 20,
          padding: 14,
          borderRadius: T.radius,
          background: T.bgTertiary,
          border: T.hairline(),
        }}
      >
        <RuleRow label="Profit target" value={`${tier.profitTargetPct}%`} />
        <RuleRow label="Max drawdown" value={`${tier.maxDrawdownPct}%`} />
        <RuleRow label="Challenge window" value={`${CHALLENGE_WINDOW_DAYS} days`} />
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={() => void handleStart()}
        style={{
          marginTop: 20,
          width: "100%",
          height: 44,
          background: T.amber,
          border: "none",
          borderRadius: T.radius,
          color: T.bgPrimary,
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1,
          fontFamily: T.font,
        }}
      >
        {loading ? "Setting up…" : `Start ${usd(tier.size)} demo account`}
      </button>
      <p
        style={{
          margin: "10px 0 0",
          textAlign: "center",
          color: T.textMuted,
          fontSize: 11,
        }}
      >
        Simulated funds · orders mirror live Kalshi prices
      </p>
    </div>
  );
}

function LiveStep({ onComplete }: { onComplete: () => void }) {
  const { update } = useSession();
  const setAccount = useAccountStore((s) => s.setAccount);
  const setAddons = useAccountStore((s) => s.setAddons);
  const applyAccountStatus = useAccountStore((s) => s.applyAccountStatus);
  const resetChallenge = useChallengeStore((s) => s.reset);

  const defaultIdx = TIERS.findIndex((t) => t.size === 25_000);
  const [tierIdx, setTierIdx] = useState(defaultIdx >= 0 ? defaultIdx : 0);
  const [selected, setSelected] = useState<AddonId[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  const tier = TIERS[tierIdx];
  const price = useMemo(() => computePrice(tier, selected), [tier, selected]);

  function toggleAddon(id: AddonId) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleProceed() {
    setCheckingOut(true);
    setError("");
    try {
      const res = await fetch("/api/billing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierSize: tier.size,
          addons: selected.map((id) => (id === "split90" ? "90split" : id)),
          planType: "challenge",
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        order?: { id: string; orderId: string };
      };

      if (!res.ok) {
        setError(data.error ?? "Could not create order.");
        return;
      }

      if (!data.order?.id) {
        setError("Could not create order.");
        return;
      }

      const payRes = await fetch(`/api/billing/orders/${data.order.id}/complete`, {
        method: "POST",
      });
      const payData = (await payRes.json()) as {
        error?: string;
        tier?: number;
        balance?: number;
      };

      if (!payRes.ok) {
        setError(payData.error ?? "Could not complete payment.");
        return;
      }

      setAccount({
        accountType: "challenge",
        challengeStatus: "active",
        tier: payData.tier!,
        balance: payData.balance!,
        accountSize: payData.tier!,
      });
      setAddons(selected);
      applyAccountStatus({
        hasActiveChallenge: true,
        challengeTier: payData.tier!,
        challengeBalance: payData.balance!,
        tradingMode: "demo",
      });

      resetChallenge();

      await update({
        tier: payData.tier,
        balance: payData.balance,
        accountType: "challenge",
        challengeStatus: "in_progress",
      });

      toast.success(`${usd(payData.tier!)} challenge started — good luck!`);
      markOnboardingDone();
      onComplete();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div>
      {error && <ErrorBanner message={error} />}

      <SectionLabel>Account size</SectionLabel>
      <TierGrid tierIdx={tierIdx} onSelect={setTierIdx} />

      <SectionLabel style={{ marginTop: 20 }}>Add-ons (optional)</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {ADDONS.map((addon) => {
          const isOn = selected.includes(addon.id);
          const addonCost =
            addon.flat ?? Math.round((addon.pctOfBase ?? 0) * tier.baseFee);

          return (
            <button
              key={addon.id}
              type="button"
              onClick={() => toggleAddon(addon.id)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: 12,
                borderRadius: T.radius,
                border: isOn ? `0.5px solid ${T.green}` : T.hairline(),
                background: isOn ? T.greenMutedBg : T.bgTertiary,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: T.font,
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  border: isOn ? `1.5px solid ${T.green}` : T.hairline(),
                  background: isOn ? T.green : "transparent",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              />
              <span style={{ flex: 1 }}>
                <span
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span style={{ color: T.textPrimary, fontSize: 13, fontWeight: 500 }}>
                    {addon.name}
                  </span>
                  <span style={{ color: T.textSecondary, fontSize: 12 }}>
                    {addonCost > 0 ? `+$${addonCost}` : "—"}
                  </span>
                </span>
                <span
                  style={{
                    display: "block",
                    color: T.textMuted,
                    fontSize: 11,
                    marginTop: 4,
                    lineHeight: 1.4,
                  }}
                >
                  {addon.blurb}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 20,
          padding: "14px 16px",
          borderRadius: T.radius,
          background: T.bgPrimary,
          border: T.hairline(),
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: T.textMuted, fontSize: 13 }}>Challenge fee</span>
          <span style={{ color: T.textPrimary, fontSize: 13 }}>${tier.baseFee}</span>
        </div>
        {price.addonLines.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: T.textMuted, fontSize: 13 }}>Add-ons</span>
            <span style={{ color: T.textPrimary, fontSize: 13 }}>
              +${price.addonSubtotal}
            </span>
          </div>
        )}
        {price.discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: T.textMuted, fontSize: 13 }}>Bundle discount</span>
            <span style={{ color: T.green, fontSize: 13 }}>−${price.discount}</span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 10,
            paddingTop: 10,
            borderTop: T.hairline(),
          }}
        >
          <span style={{ color: T.textPrimary, fontSize: 14, fontWeight: 600 }}>
            Total
          </span>
          <span style={{ color: T.green, fontSize: 18, fontWeight: 600 }}>
            ${price.total}
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled={checkingOut}
        onClick={() => void handleProceed()}
        style={{
          marginTop: 16,
          width: "100%",
          height: 44,
          background: T.green,
          border: "none",
          borderRadius: T.radius,
          color: T.bgPrimary,
          fontSize: 14,
          fontWeight: 600,
          cursor: checkingOut ? "wait" : "pointer",
          opacity: checkingOut ? 0.7 : 1,
          fontFamily: T.font,
        }}
      >
        {checkingOut
          ? "Processing…"
          : `Start ${usd(tier.size)} challenge`}
      </button>
      <p
        style={{
          margin: "10px 0 0",
          textAlign: "center",
          color: T.textMuted,
          fontSize: 11,
        }}
      >
        Mock checkout — your challenge starts immediately in the dashboard.
      </p>
    </div>
  );
}

function TierGrid({
  tierIdx,
  onSelect,
}: {
  tierIdx: number;
  onSelect: (idx: number) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 8,
        marginTop: 10,
      }}
    >
      {TIERS.map((t, i) => (
        <button
          key={t.size}
          type="button"
          onClick={() => onSelect(i)}
          style={{
            padding: "10px 8px",
            borderRadius: T.radius,
            border: i === tierIdx ? `0.5px solid ${T.green}` : T.hairline(),
            background: i === tierIdx ? T.greenMutedBg : T.bgTertiary,
            cursor: "pointer",
            textAlign: "center",
            fontFamily: T.font,
          }}
        >
          <div style={{ color: T.textPrimary, fontSize: 13, fontWeight: 600 }}>
            {usd(t.size)}
          </div>
          <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>
            ${t.baseFee}
          </div>
        </button>
      ))}
    </div>
  );
}

function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        color: T.green,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "4px 0",
      }}
    >
      <span style={{ color: T.textMuted, fontSize: 12 }}>{label}</span>
      <span style={{ color: T.textPrimary, fontSize: 12, fontWeight: 500 }}>
        {value}
      </span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        marginBottom: 16,
        padding: "10px 14px",
        borderRadius: T.radius,
        background: "rgba(239,68,68,0.1)",
        border: "1px solid rgba(239,68,68,0.35)",
        color: T.red,
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}
