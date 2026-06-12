"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { IconX } from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";
import { useAccountStore } from "@/stores/accountStore";
import { usePositionStore } from "@/stores/positionStore";
import { feePctForDaysEarly } from "@/lib/payouts";
import { PAYOUT_CYCLE_DAYS } from "@/lib/data";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { T } from "@/lib/tokens";

type PayoutRecord = {
  id: string;
  date: number;
  type: "Scheduled" | "Early withdrawal";
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
  const closedTrades = usePositionStore(useShallow((s) => s.closedTrades));

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [earlyOpen, setEarlyOpen] = useState(false);
  const [history, setHistory] = useState<PayoutRecord[]>([]);

  // Available = realized profit from completed cycles; pending = current cycle.
  const realized = useMemo(
    () => closedTrades.reduce((sum, t) => sum + t.pnl, 0),
    [closedTrades],
  );
  const available = accountType === "funded" ? Math.max(0, realized * 0.7) : 0;
  const pending = Math.max(0, realized) - available;

  const { nextPayoutDate, daysUntilPayout } = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + PAYOUT_CYCLE_DAYS);
    return {
      nextPayoutDate: d,
      daysUntilPayout: Math.max(
        0,
        Math.ceil((d.getTime() - Date.now()) / 86_400_000),
      ),
    };
  }, []);

  function recordPayout(record: PayoutRecord) {
    setHistory((h) => [record, ...h]);
  }

  return (
    <ErrorBoundary name="Payouts">
      <div style={{ padding: 32, maxWidth: 920, fontFamily: T.font }}>
        {/* Balance cards */}
        <div style={{ display: "flex", gap: 16 }}>
          <BalanceCard label="Available balance" value={money(available)} />
          <BalanceCard label="Pending balance" value={money(pending)} />
        </div>

        <div
          style={{
            marginTop: 16,
            color: T.textMuted,
            fontSize: 13,
          }}
        >
          Next payout:{" "}
          <span style={{ color: T.textPrimary }}>
            {nextPayoutDate.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}
          </span>{" "}
          — expected{" "}
          <span style={{ color: T.textPrimary }}>{money(available)}</span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button
            type="button"
            disabled={available <= 0}
            onClick={() => setConfirmOpen(true)}
            style={{
              background: T.green,
              border: "none",
              borderRadius: T.radius,
              color: T.bgPrimary,
              fontSize: 14,
              fontWeight: 500,
              padding: "12px 24px",
              cursor: available > 0 ? "pointer" : "not-allowed",
              opacity: available > 0 ? 1 : 0.5,
              fontFamily: T.font,
            }}
          >
            Request payout
          </button>
          <button
            type="button"
            disabled={pending <= 0 && available <= 0}
            onClick={() => setEarlyOpen(true)}
            style={{
              background: "transparent",
              border: `0.5px solid ${T.textPrimary}`,
              borderRadius: T.radius,
              color: T.textPrimary,
              fontSize: 14,
              fontWeight: 500,
              padding: "12px 24px",
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            Early withdrawal
          </button>
        </div>

        <PayoutHistoryTable history={history} />
      </div>

      {/* Request payout modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Request payout">
        <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          You are requesting a payout of{" "}
          <span style={{ color: T.textPrimary }}>{money(available)}</span> via
          ACH bank transfer. Processing takes 3–5 business days.
        </p>
        <button
          type="button"
          onClick={async () => {
            const res = await fetch("/api/payouts/request", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ amount: available }),
            });
            setConfirmOpen(false);
            if (res.ok) {
              recordPayout({
                id: crypto.randomUUID(),
                date: Date.now(),
                type: "Scheduled",
                gross: available,
                fee: 0,
                net: available,
                status: "Pending",
                method: "ACH",
              });
              toast.success("Payout requested — arriving in 3–5 business days.");
            } else {
              toast.error("Payout request failed. Please try again.");
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

      {/* Early withdrawal modal */}
      <EarlyWithdrawalModal
        open={earlyOpen}
        onClose={() => setEarlyOpen(false)}
        daysUntilPayout={daysUntilPayout}
        maxAmount={available + pending}
        onComplete={recordPayout}
      />
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

function EarlyWithdrawalModal({
  open,
  onClose,
  daysUntilPayout,
  maxAmount,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  daysUntilPayout: number;
  maxAmount: number;
  onComplete: (record: PayoutRecord) => void;
}) {
  const [amount, setAmount] = useState(0);

  const feePct = feePctForDaysEarly(daysUntilPayout);
  const fee = (amount * feePct) / 100;
  const net = amount - fee;

  return (
    <Modal open={open} onClose={onClose} title="Early withdrawal">
      <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
        Your next scheduled payout is in{" "}
        <span style={{ color: T.textPrimary }}>{daysUntilPayout} days</span>.
        Withdrawing now applies a {feePct}% liquidity fee.
      </p>

      <div
        style={{
          marginTop: 16,
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
          min={0}
          max={maxAmount}
          value={amount === 0 ? "" : amount}
          placeholder="0"
          onChange={(e) =>
            setAmount(Math.min(maxAmount, Math.max(0, Number(e.target.value))))
          }
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: T.textPrimary,
            fontSize: 18,
            fontWeight: 500,
            flex: 1,
            fontFamily: T.font,
          }}
        />
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <Row label={`Fee (${feePct}%)`} value={`−${money(fee)}`} color={T.red} />
        <Row label="You receive" value={money(Math.max(0, net))} color={T.green} />
      </div>

      <button
        type="button"
        disabled={amount <= 0}
        onClick={async () => {
          const res = await fetch("/api/payouts/early-withdrawal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, daysEarly: daysUntilPayout }),
          });
          onClose();
          if (res.ok) {
            onComplete({
              id: crypto.randomUUID(),
              date: Date.now(),
              type: "Early withdrawal",
              gross: amount,
              fee,
              net: Math.max(0, net),
              status: "Processing",
              method: "ACH",
            });
            toast.success(`Early withdrawal requested — ${money(net)} net.`);
          } else {
            toast.error("Early withdrawal failed. Please try again.");
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
          cursor: amount > 0 ? "pointer" : "not-allowed",
          opacity: amount > 0 ? 1 : 0.5,
          fontFamily: T.font,
        }}
      >
        Confirm early withdrawal
      </button>
    </Modal>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: T.textMuted, fontSize: 13 }}>{label}</span>
      <span style={{ color, fontSize: 13, fontWeight: 500 }}>{value}</span>
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
