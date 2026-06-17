"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { IconCreditCard } from "@tabler/icons-react";
import { useAccountStore } from "@/stores/accountStore";
import {
  DashboardCard,
  DashboardPage,
  greenButtonStyle,
} from "@/components/dashboard/DashboardPage";
import { T } from "@/lib/tokens";
import { formatUsd, type AddonId } from "@/lib/pricing";
import { normalizePurchasedAddons } from "@/lib/addonIds";
import type { BillingOrderDto } from "@/lib/billing-types";

function mapAddonsToStore(addons: BillingOrderDto["addons"]): AddonId[] {
  return normalizePurchasedAddons(addons);
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function planLabel(order: BillingOrderDto): string {
  const tier = formatUsd(order.tierSize);
  return order.planType === "reset" ? `${tier} Reset` : `${tier} Challenge`;
}

export function BillingPanel() {
  const router = useRouter();
  const { update } = useSession();
  const setAccount = useAccountStore((s) => s.setAccount);
  const setAddons = useAccountStore((s) => s.setAddons);

  const [orders, setOrders] = useState<BillingOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing");
      if (!res.ok) {
        setOrders([]);
        return;
      }
      const data = (await res.json()) as { orders?: BillingOrderDto[] };
      setOrders(data.orders ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function completePayment(order: BillingOrderDto) {
    setCompletingId(order.id);
    try {
      const res = await fetch(`/api/billing/orders/${order.id}/complete`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        error?: string;
        tier?: number;
        balance?: number;
      };

      if (!res.ok) {
        toast.error(data.error ?? "Payment could not be completed.");
        return;
      }

      setAccount({
        accountType: "challenge",
        challengeStatus: "active",
        tier: data.tier ?? order.tierSize,
        balance: data.balance ?? order.balance,
        accountSize: data.tier ?? order.tierSize,
      });
      setAddons(mapAddonsToStore(order.addons));
      await update();
      toast.success("Payment complete — your challenge is active.");
      await loadOrders();
      router.push("/dashboard/markets");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <DashboardPage title="Billing" maxWidth={960}>
      <DashboardCard title="Plans & payments">
        <p style={{ margin: "0 0 16px", color: T.textMuted, fontSize: 13, lineHeight: 1.5 }}>
          View every challenge plan you have selected, its account balance, price,
          and payment status. Complete any pending order to activate your account.
        </p>

        {loading ? (
          <p style={{ margin: 0, color: T.textMuted, fontSize: 13 }}>Loading orders…</p>
        ) : orders.length === 0 ? (
          <div
            style={{
              borderRadius: T.radius,
              border: T.hairline(),
              background: T.bgTertiary,
              padding: 24,
              textAlign: "center",
            }}
          >
            <IconCreditCard
              size={28}
              stroke={1.25}
              color={T.textMuted}
              style={{ margin: "0 auto 12px" }}
            />
            <p style={{ margin: 0, color: T.textPrimary, fontSize: 14, fontWeight: 500 }}>
              No billing history yet
            </p>
            <p style={{ margin: "8px 0 0", color: T.textMuted, fontSize: 13 }}>
              Choose a challenge plan to create your first order.
            </p>
            <button
              type="button"
              onClick={() => router.push("/dashboard/challenge/select")}
              style={{ ...greenButtonStyle, marginTop: 16 }}
            >
              Choose a plan
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: T.hairline() }}>
                  {[
                    "Order ID",
                    "Plan",
                    "Account number",
                    "Balance",
                    "Price",
                    "Status",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        color: T.textMuted,
                        fontWeight: 500,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const isPending = order.status === "pending";
                  const isCompleting = completingId === order.id;

                  return (
                    <tr
                      key={order.id}
                      style={{ borderBottom: `0.5px solid ${T.border}` }}
                    >
                      <td style={{ padding: "14px 12px", color: T.textPrimary, fontFamily: "monospace", fontSize: 12 }}>
                        {order.orderId}
                      </td>
                      <td style={{ padding: "14px 12px", color: T.textPrimary }}>
                        {planLabel(order)}
                      </td>
                      <td style={{ padding: "14px 12px", color: T.textSecondary, fontFamily: "monospace", fontSize: 12 }}>
                        {order.accountNumber ?? "—"}
                      </td>
                      <td style={{ padding: "14px 12px", color: T.textPrimary }}>
                        {formatUsd(order.balance)}
                      </td>
                      <td style={{ padding: "14px 12px", color: T.textPrimary, fontWeight: 500 }}>
                        {money(order.price)}
                      </td>
                      <td style={{ padding: "14px 12px" }}>
                        <StatusBadge status={order.status} />
                      </td>
                      <td style={{ padding: "14px 12px", textAlign: "right" }}>
                        {isPending ? (
                          <button
                            type="button"
                            disabled={isCompleting}
                            onClick={() => void completePayment(order)}
                            style={{
                              ...greenButtonStyle,
                              padding: "8px 14px",
                              fontSize: 12,
                              opacity: isCompleting ? 0.6 : 1,
                              cursor: isCompleting ? "not-allowed" : "pointer",
                            }}
                          >
                            {isCompleting ? "Processing…" : "Complete payment"}
                          </button>
                        ) : (
                          <span style={{ color: T.textMuted, fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>
    </DashboardPage>
  );
}

function StatusBadge({ status }: { status: BillingOrderDto["status"] }) {
  const paid = status === "paid";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        textTransform: "capitalize",
        background: paid ? T.greenMutedBg : "rgba(251, 191, 36, 0.12)",
        color: paid ? T.green : "#fbbf24",
        border: paid ? `0.5px solid ${T.green}40` : "0.5px solid rgba(251, 191, 36, 0.35)",
      }}
    >
      {paid ? "Paid" : "Pending"}
    </span>
  );
}
