"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import { useUiStore } from "@/stores/uiStore";
import { useAccountStore } from "@/stores/accountStore";
import { useChallengeStore } from "@/stores/challengeStore";
import { LeniumMark } from "@/components/ui/LeniumLogo";
import {
  TIERS,
  ADDONS,
  SPLIT_ADDONS,
  computePrice,
  usd,
  type AddonId,
} from "@/lib/data";
import { T } from "@/lib/tokens";

const PANEL_WIDTH = 520;

export function ChallengeStartModal() {
  const open = useUiStore((s) => s.challengeModalOpen);
  const close = useUiStore((s) => s.closeChallengeModal);

  return (
    <AnimatePresence>
      {open && <Panel onClose={close} />}
    </AnimatePresence>
  );
}

function Panel({ onClose }: { onClose: () => void }) {
  const { update } = useSession();
  const setAccount = useAccountStore((s) => s.setAccount);
  const resetChallenge = useChallengeStore((s) => s.reset);

  const [tierIdx, setTierIdx] = useState(1);
  const [selected, setSelected] = useState<AddonId[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  const tier = TIERS[tierIdx];
  const price = useMemo(() => computePrice(tier, selected), [tier, selected]);

  function toggleAddon(id: AddonId) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      let next = [...prev, id];
      if (SPLIT_ADDONS.includes(id)) {
        next = next.filter((x) => x === id || !SPLIT_ADDONS.includes(x));
      }
      return next;
    });
  }

  async function handleProceed() {
    setCheckingOut(true);
    setError("");
    try {
      const res = await fetch("/api/challenges/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierSize: tier.size, addons: selected }),
      });
      const data = (await res.json()) as {
        error?: string;
        tier?: number;
        balance?: number;
        accountType?: "challenge";
        challengeStatus?: "in_progress";
      };

      if (!res.ok) {
        setError(data.error ?? "Could not start challenge.");
        return;
      }

      setAccount({
        accountType: "challenge",
        challengeStatus: "active",
        tier: data.tier!,
        balance: data.balance!,
        accountSize: data.tier!,
      });

      resetChallenge();

      await update({
        tier: data.tier,
        balance: data.balance,
        accountType: "challenge",
        challengeStatus: "in_progress",
      });

      toast.success(`${usd(data.tier!)} challenge started — good luck!`);
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,10,0.72)",
        backdropFilter: "blur(4px)",
        zIndex: 130,
        display: "flex",
        justifyContent: "flex-end",
        fontFamily: T.font,
      }}
    >
      <motion.aside
        initial={{ x: PANEL_WIDTH }}
        animate={{ x: 0 }}
        exit={{ x: PANEL_WIDTH }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(100vw, " + PANEL_WIDTH + "px)",
          height: "100%",
          background: T.bgSecondary,
          borderLeft: T.hairline(),
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: T.hairline(),
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LeniumMark size={32} variant="green" />
            <div>
              <div style={{ color: T.textPrimary, fontSize: 16, fontWeight: 600 }}>
                Start a challenge
              </div>
              <div style={{ color: T.textMuted, fontSize: 12, marginTop: 2 }}>
                Demo evaluation on live Kalshi prices
              </div>
            </div>
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
            }}
          >
            <IconX size={16} stroke={1.5} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px" }}>
          {error && (
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
              {error}
            </div>
          )}

          <SectionLabel>Account size</SectionLabel>
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
                onClick={() => setTierIdx(i)}
                style={{
                  padding: "10px 8px",
                  borderRadius: T.radius,
                  border:
                    i === tierIdx
                      ? `0.5px solid ${T.green}`
                      : T.hairline(),
                  background: i === tierIdx ? T.greenMutedBg : T.bgTertiary,
                  cursor: "pointer",
                  textAlign: "center",
                  fontFamily: T.font,
                }}
              >
                <div
                  style={{
                    color: T.textPrimary,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {usd(t.size)}
                </div>
                <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>
                  ${t.baseFee}
                </div>
              </button>
            ))}
          </div>

          <SectionLabel style={{ marginTop: 24 }}>Add-ons (optional)</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {ADDONS.map((addon) => {
              const isOn = selected.includes(addon.id);
              const disabledBySplit =
                SPLIT_ADDONS.includes(addon.id) &&
                !isOn &&
                selected.some((x) => SPLIT_ADDONS.includes(x) && x !== addon.id);
              const addonCost =
                addon.flat ?? Math.round((addon.pctOfBase ?? 0) * tier.baseFee);

              return (
                <button
                  key={addon.id}
                  type="button"
                  disabled={disabledBySplit}
                  onClick={() => toggleAddon(addon.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: 12,
                    borderRadius: T.radius,
                    border: isOn ? `0.5px solid ${T.green}` : T.hairline(),
                    background: isOn ? T.greenMutedBg : T.bgTertiary,
                    cursor: disabledBySplit ? "not-allowed" : "pointer",
                    opacity: disabledBySplit ? 0.45 : 1,
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

          <SectionLabel style={{ marginTop: 24 }}>Challenge rules</SectionLabel>
          <div
            style={{
              marginTop: 10,
              background: T.bgTertiary,
              border: T.hairline(),
              borderRadius: T.radius,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <RuleRow label="Profit target" value={`${tier.profitTargetPct}%`} />
            <RuleRow label="Max drawdown" value={`${tier.maxDrawdownPct}%`} />
            <RuleRow label="Daily loss limit" value={`${tier.dailyLimitPct}%`} />
            <RuleRow label="Min trading days" value={`${tier.minTradingDays} days`} />
            <RuleRow label="Challenge window" value={`${tier.windowDays} days`} />
            <RuleRow
              label="Max position"
              value={`${tier.maxPositionPct}% of account`}
            />
          </div>
        </div>

        {/* Footer / checkout */}
        <div
          style={{
            padding: "16px 24px 24px",
            borderTop: T.hairline(),
            background: T.bgPrimary,
            flexShrink: 0,
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
      </motion.aside>
    </motion.div>
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
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: T.textMuted, fontSize: 12 }}>{label}</span>
      <span style={{ color: T.textPrimary, fontSize: 12, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
