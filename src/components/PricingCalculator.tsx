"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  TIERS,
  ADDONS,
  SPLIT_ADDONS,
  computePrice,
  addonPrice,
  usd,
  type AddonId,
} from "@/lib/data";
import { loginWithCallback, CHALLENGE_SELECT_PATH } from "@/lib/callback-url";
import { startNavigationLoading } from "@/components/NavigationLoader";
import { useAccountStore } from "@/stores/accountStore";
import { T } from "@/lib/tokens";

type PricingCalculatorProps = {
  /** Public site sends users to login; dashboard completes purchase in-app. */
  variant?: "public" | "dashboard";
};

export function PricingCalculator({ variant = "public" }: PricingCalculatorProps) {
  const [sizeIdx, setSizeIdx] = useState(1);
  const [selected, setSelected] = useState<AddonId[]>([]);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  const router = useRouter();
  const { update } = useSession();

  const tier = TIERS[sizeIdx];

  const toggle = (id: AddonId) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      let next = [...prev, id];
      if (SPLIT_ADDONS.includes(id)) {
        next = next.filter((x) => x === id || !SPLIT_ADDONS.includes(x));
      }
      return next;
    });
  };

  const price = useMemo(() => computePrice(tier, selected), [tier, selected]);

  async function handleDashboardCheckout() {
    setCheckoutError("");
    setCheckingOut(true);
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
      };

      if (!res.ok) {
        setCheckoutError(data.error ?? "Could not start challenge. Try again.");
        return;
      }

      await update({
        user: {
          accountType: "challenge",
          tier: data.tier,
          balance: data.balance,
          challengeStatus: "in_progress",
        },
      });

      useAccountStore.getState().setAccount({
        accountType: "challenge",
        challengeStatus: "active",
        tier: data.tier ?? tier.size,
        balance: data.balance ?? tier.size,
        accountSize: data.tier ?? tier.size,
      });

      startNavigationLoading();
      router.push("/dashboard/markets");
      router.refresh();
    } catch {
      setCheckoutError("Something went wrong. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  }

  const isDashboard = variant === "dashboard";
  const cardClass = isDashboard
    ? "rounded-2xl border p-6"
    : "rounded-2xl border border-border bg-surface p-6";
  const cardStyle = isDashboard
    ? {
        borderColor: T.border,
        background: T.bgSecondary,
        fontFamily: T.font,
      }
    : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-8">
        <div>
          <h3
            className={
              isDashboard
                ? "text-sm font-semibold uppercase tracking-wide"
                : "text-sm font-semibold uppercase tracking-wide text-muted"
            }
            style={isDashboard ? { color: T.textMuted } : undefined}
          >
            Account size
          </h3>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-3">
            {TIERS.map((t, i) => (
              <button
                key={t.size}
                type="button"
                onClick={() => setSizeIdx(i)}
                className={
                  isDashboard
                    ? undefined
                    : `relative rounded-xl border px-3 py-3 text-center transition-colors ${
                        i === sizeIdx
                          ? "border-brand bg-brand-soft"
                          : "border-border hover:border-brand/40"
                      }`
                }
                style={
                  isDashboard
                    ? {
                        borderRadius: 10,
                        border:
                          i === sizeIdx
                            ? `1px solid ${T.green}`
                            : T.hairline(),
                        background:
                          i === sizeIdx ? T.greenMutedBg : T.bgTertiary,
                        padding: "12px 10px",
                        textAlign: "center",
                        cursor: "pointer",
                        fontFamily: T.font,
                      }
                    : undefined
                }
              >
                <div
                  className={isDashboard ? undefined : "text-base font-semibold tracking-tight"}
                  style={
                    isDashboard
                      ? {
                          fontSize: 15,
                          fontWeight: 600,
                          color: T.textPrimary,
                        }
                      : undefined
                  }
                >
                  {usd(t.size)}
                </div>
                <div
                  className={isDashboard ? undefined : "text-xs text-muted"}
                  style={
                    isDashboard
                      ? { fontSize: 11, color: T.textMuted, marginTop: 2 }
                      : undefined
                  }
                >
                  ${t.baseFee}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3
            className={
              isDashboard
                ? "text-sm font-semibold uppercase tracking-wide"
                : "text-sm font-semibold uppercase tracking-wide text-muted"
            }
            style={isDashboard ? { color: T.textMuted } : undefined}
          >
            Add-ons
          </h3>
          <div className="mt-3 space-y-2">
            {ADDONS.map((a) => {
              const isOn = selected.includes(a.id);
              const disabledBySplit =
                SPLIT_ADDONS.includes(a.id) &&
                !isOn &&
                selected.some((x) => SPLIT_ADDONS.includes(x) && x !== a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggle(a.id)}
                  disabled={disabledBySplit}
                  className={
                    isDashboard
                      ? undefined
                      : `flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                          isOn
                            ? "border-brand bg-brand-soft"
                            : "border-border hover:border-brand/40"
                        } ${disabledBySplit ? "opacity-50" : ""}`
                  }
                  style={
                    isDashboard
                      ? {
                          display: "flex",
                          width: "100%",
                          alignItems: "flex-start",
                          gap: 12,
                          borderRadius: 10,
                          border: isOn
                            ? `1px solid ${T.green}`
                            : T.hairline(),
                          background: isOn ? T.greenMutedBg : T.bgTertiary,
                          padding: 14,
                          textAlign: "left",
                          cursor: disabledBySplit ? "not-allowed" : "pointer",
                          opacity: disabledBySplit ? 0.5 : 1,
                          fontFamily: T.font,
                        }
                      : undefined
                  }
                >
                  <span
                    className={
                      isDashboard
                        ? undefined
                        : `mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border ${
                            isOn
                              ? "border-brand bg-brand text-[#04130b]"
                              : "border-border"
                          }`
                    }
                    style={
                      isDashboard
                        ? {
                            marginTop: 2,
                            width: 20,
                            height: 20,
                            flexShrink: 0,
                            display: "grid",
                            placeItems: "center",
                            borderRadius: 6,
                            border: isOn
                              ? `1px solid ${T.green}`
                              : T.hairline(),
                            background: isOn ? T.green : "transparent",
                            color: T.bgPrimary,
                            fontSize: 11,
                          }
                        : undefined
                    }
                  >
                    {isOn && "✓"}
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span
                        className={isDashboard ? undefined : "font-medium"}
                        style={
                          isDashboard
                            ? { fontWeight: 500, color: T.textPrimary }
                            : undefined
                        }
                      >
                        {a.name}
                      </span>
                      <span
                        className={isDashboard ? undefined : "font-semibold"}
                        style={
                          isDashboard
                            ? { fontWeight: 600, color: T.textPrimary }
                            : undefined
                        }
                      >
                        {addonPrice(a, tier.baseFee) === 0
                          ? "—"
                          : `+$${addonPrice(a, tier.baseFee)}`}
                      </span>
                    </span>
                    <span
                      className={
                        isDashboard ? undefined : "mt-0.5 block text-sm text-muted"
                      }
                      style={
                        isDashboard
                          ? {
                              marginTop: 4,
                              display: "block",
                              fontSize: 13,
                              color: T.textMuted,
                            }
                          : undefined
                      }
                    >
                      {a.blurb}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="lg:sticky lg:top-20 h-fit">
        <div className={cardClass} style={cardStyle}>
          <div
            className={isDashboard ? undefined : "text-sm text-muted"}
            style={isDashboard ? { fontSize: 13, color: T.textMuted } : undefined}
          >
            {usd(tier.size)} evaluation account
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <Row label="Base challenge fee" value={`$${price.baseFee}`} dashboard={isDashboard} />
            {price.addonLines.map((l) => (
              <Row
                key={l.id}
                label={l.name}
                value={`+$${l.price}`}
                muted
                dashboard={isDashboard}
              />
            ))}
            {price.discount > 0 && (
              <Row
                label={`Bundle discount (${Math.round(price.discountPct * 100)}%)`}
                value={`−$${price.discount}`}
                accent
                dashboard={isDashboard}
              />
            )}
          </div>

          <div className="mt-4 flex items-end justify-between border-t pt-4" style={isDashboard ? { borderColor: T.border } : { borderColor: undefined }}>
            <span
              className={isDashboard ? undefined : "text-sm text-muted"}
              style={isDashboard ? { fontSize: 13, color: T.textMuted } : undefined}
            >
              Total today
            </span>
            <span
              className={isDashboard ? undefined : "text-3xl font-semibold tracking-tight"}
              style={
                isDashboard
                  ? { fontSize: 28, fontWeight: 600, color: T.textPrimary }
                  : undefined
              }
            >
              ${price.total}
            </span>
          </div>

          <div
            className={
              isDashboard
                ? undefined
                : "mt-3 rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand-strong"
            }
            style={
              isDashboard
                ? {
                    marginTop: 12,
                    borderRadius: 8,
                    background: T.greenMutedBg,
                    border: T.hairline(T.greenMutedBorder),
                    padding: "10px 12px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: T.green,
                  }
                : undefined
            }
          >
            Hit your $
            {Math.round((tier.size * tier.profitTargetPct) / 100).toLocaleString()}{" "}
            profit goal to get funded with {usd(tier.size)} in capital
          </div>

          {checkoutError && (
            <p
              role="alert"
              className="mt-3 text-sm"
              style={{ color: T.red }}
            >
              {checkoutError}
            </p>
          )}

          {isDashboard ? (
            <button
              type="button"
              onClick={handleDashboardCheckout}
              disabled={checkingOut}
              style={{
                marginTop: 16,
                display: "block",
                width: "100%",
                borderRadius: 10,
                background: T.green,
                color: T.bgPrimary,
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                cursor: checkingOut ? "wait" : "pointer",
                opacity: checkingOut ? 0.7 : 1,
                fontFamily: T.font,
              }}
            >
              {checkingOut
                ? "Processing…"
                : `Pay $${price.total} & start ${usd(tier.size)} challenge`}
            </button>
          ) : (
            <>
              <Link
                href={loginWithCallback(CHALLENGE_SELECT_PATH)}
                className="mt-4 block w-full rounded-xl bg-brand py-3 text-center text-sm font-semibold text-[#04130b] transition-colors hover:bg-brand-strong"
              >
                Start {usd(tier.size)} challenge
              </Link>
              <p className="mt-2 text-center text-xs text-muted">
                Log in or create an account to purchase.
              </p>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  accent,
  dashboard,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
  dashboard?: boolean;
}) {
  if (dashboard) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: muted ? T.textMuted : T.textSecondary, fontSize: 13 }}>
          {label}
        </span>
        <span
          style={{
            fontWeight: 500,
            color: accent ? T.green : T.textPrimary,
            fontSize: 13,
          }}
        >
          {value}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted" : ""}>{label}</span>
      <span className={`font-medium ${accent ? "text-brand-strong" : ""}`}>
        {value}
      </span>
    </div>
  );
}
