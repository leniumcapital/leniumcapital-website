"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { IconX } from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";
import { useAccountStore } from "@/stores/accountStore";
import { usePositionStore } from "@/stores/positionStore";
import { useAccountRules } from "@/hooks/useAccountRules";
import { netWithdrawableProfit } from "@/lib/rules";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { T } from "@/lib/tokens";

type PayoutRecord = {
  id: string;
  date: number;
  type: "Payout";
  gross: number;
  fee: number;
  net: number;
  status: "Completed" | "Pending" | "Processing";
  method: string;
};

function money(n: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PayoutsPage() {
  const accountType = useAccountStore((s) => s.accountType);
  const commissionsPaid = useAccountStore((s) => s.commissionsPaid);
  const closedTrades = usePositionStore(useShallow((s) => s.closedTrades));
  const { rules } = useAccountRules();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [history, setHistory] = useState<PayoutRecord[]>([]);

  const grossProfit = useMemo(
    () => closedTrades.reduce((sum, t) => sum + t.pnl, 0),
    [closedTrades],
  );

  const available = useMemo(() => {
    if (accountType !== "funded" || !rules) return 0;
    return netWithdrawableProfit({
      grossProfit: Math.max(0, grossProfit),
      traderSplitPct: rules.traderSplitPct,
      commissionsPaid,
    });
  }, [accountType, rules, grossProfit, commissionsPaid]);

  const minPayout = rules?.minPayoutUsd ?? 0;
  const canRequest = available >= minPayout && minPayout > 0;

  function recordPayout(record: PayoutRecord) {
    setHistory((h) => [record, ...h]);
  }

  return (
    <ErrorBoundary name="Payouts">
      <div style={{ padding: 32, maxWidth: 920, fontFamily: T.font }}>
        <div style={{ display: "flex", gap: 16 }}>
          <BalanceCard label="Available balance" value={money(available)} />
          <BalanceCard
            label="Gross realized profit"
            value={money(Math.max(0, grossProfit))}
          />
        </div>

        <div
          style={{
            marginTop: 16,
            color: T.textMuted,
            fontSize: 13,
          }}
        >
          Payouts process within{" "}
          <span style={{ color: T.textPrimary }}>
            {rules?.payoutCycleDays ?? 7} business days
          </span>{" "}
          of each request via ACH.
          {rules && (
            <>
              {" "}
              Minimum payout: {money(minPayout)} (2% of starting balance).
              {rules.traderSplitPct > 70 && (
                <> Split: {rules.traderSplitPct}/{100 - rules.traderSplitPct}.</>
              )}
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button
            type="button"
            disabled={!canRequest}
            onClick={() => setConfirmOpen(true)}
            style={{
              background: T.green,
              border: "none",
              borderRadius: T.radius,
              color: T.bgPrimary,
              fontSize: 14,
              fontWeight: 500,
              padding: "12px 24px",
              cursor: canRequest ? "pointer" : "not-allowed",
              opacity: canRequest ? 1 : 0.5,
              fontFamily: T.font,
            }}
          >
            Request payout
          </button>
        </div>

        {!canRequest && accountType === "funded" && minPayout > 0 && (
          <p style={{ marginTop: 12, color: T.textMuted, fontSize: 12 }}>
            {available > 0
              ? `Available balance (${money(available)}) is below the ${money(minPayout)} minimum.`
              : "No withdrawable profit yet."}
          </p>
        )}

        <PayoutHistoryTable history={history} />
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Request payout">
        <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          You are requesting a payout of{" "}
          <span style={{ color: T.textPrimary }}>{money(available)}</span> via
          ACH bank transfer. Processing takes {rules?.payoutCycleDays ?? 7}{" "}
          business days.
        </p>
        <button
          type="button"
          onClick={async () => {
            const res = await fetch("/api/payouts/request", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: available,
                minPayoutUsd: minPayout,
                accountType,
              }),
            });
            setConfirmOpen(false);
            if (res.ok) {
              recordPayout({
                id: crypto.randomUUID(),
                date: Date.now(),
                type: "Payout",
                gross: available,
                fee: 0,
                net: available,
                status: "Pending",
                method: "ACH",
              });
              toast.success(
                `Payout requested — arriving in ${rules?.payoutCycleDays ?? 7} business days.`,
              );
            } else {
              const data = (await res.json()) as { error?: string };
              toast.error(data.error ?? "Payout request failed.");
            }
          }}
          style={{
            marginTop: 20,
            width: "100%",
            height: 44,
            background: T.green,
            border: "none",
            borderRadius: T.radius,
            color: T.bgPrimary,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: T.font,
          }}
        >
          Confirm payout of {money(available)}
        </button>
      </Modal>
    </ErrorBoundary>
  );
}

function BalanceCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: T.bgSecondary,
        border: T.hairline(),
        borderRadius: T.radiusLg,
        padding: 24,
      }}
    >
      <div style={{ color: T.textMuted, fontSize: 13 }}>{label}</div>
      <div
        style={{
          color: T.textPrimary,
          fontSize: 28,
          fontWeight: 500,
          marginTop: 6,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,10,10,0.8)",
            zIndex: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: T.font,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 400,
              background: T.bgSecondary,
              border: T.hairline(),
              borderRadius: T.radiusLg,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <span style={{ color: T.textPrimary, fontSize: 15, fontWeight: 500 }}>
                {title}
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: T.textMuted,
                  display: "flex",
                }}
              >
                <IconX size={16} stroke={1.5} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const HISTORY_COLUMNS = [
  "Date",
  "Type",
  "Gross amount",
  "Fee",
  "Net amount",
  "Status",
  "Method",
] as const;

function PayoutHistoryTable({ history }: { history: PayoutRecord[] }) {
  if (history.length === 0) {
    return (
      <div style={{ color: T.textMuted, fontSize: 13, marginTop: 40 }}>
        No payouts yet.
      </div>
    );
  }

  const statusStyle = (status: PayoutRecord["status"]) => {
    if (status === "Completed")
      return { bg: T.greenMutedBg, border: T.greenMutedBorder, color: T.green };
    if (status === "Pending")
      return { bg: T.amberMuted, border: "rgba(245,158,11,0.3)", color: T.amber };
    return {
      bg: "rgba(59,130,246,0.1)",
      border: "rgba(59,130,246,0.3)",
      color: "#3B82F6",
    };
  };

  const cell: React.CSSProperties = {
    padding: "0 16px",
    textAlign: "right",
    fontSize: 13,
    color: T.textPrimary,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 40 }}>
      <thead>
        <tr style={{ background: T.bgSecondary }}>
          {HISTORY_COLUMNS.map((col) => (
            <th
              key={col}
              style={{
                color: T.textMuted,
                fontSize: 12,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                textAlign: col === "Date" || col === "Type" ? "left" : "right",
                padding: "12px 16px",
                whiteSpace: "nowrap",
              }}
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {history.map((r) => {
          const s = statusStyle(r.status);
          return (
            <tr key={r.id} style={{ height: 52, borderBottom: T.hairline() }}>
              <td style={{ ...cell, textAlign: "left", color: T.textSecondary }}>
                {new Date(r.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td style={{ ...cell, textAlign: "left" }}>{r.type}</td>
              <td style={cell}>{money(r.gross)}</td>
              <td style={{ ...cell, color: r.fee > 0 ? T.red : T.textSecondary }}>
                {r.fee > 0 ? `−${money(r.fee)}` : money(0)}
              </td>
              <td style={{ ...cell, fontWeight: 500 }}>{money(r.net)}</td>
              <td style={cell}>
                <span
                  style={{
                    background: s.bg,
                    border: T.hairline(s.border),
                    color: s.color,
                    fontSize: 11,
                    fontWeight: 500,
                    borderRadius: 4,
                    padding: "2px 8px",
                  }}
                >
                  {r.status}
                </span>
              </td>
              <td style={{ ...cell, color: T.textSecondary }}>{r.method}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
