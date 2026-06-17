"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { IconX } from "@tabler/icons-react";
import { LeniumMark } from "@/components/ui/LeniumLogo";
import { useUiStore } from "@/stores/uiStore";
import { T } from "@/lib/tokens";

const STATS = [
  { label: "Account sizes", value: "$5K to $100K" },
  { label: "Starting from", value: "$65 one-time fee" },
  { label: "Your profit split", value: "Up to 90%" },
] as const;

export function AccountGateModal() {
  const open = useUiStore((s) => s.accountGateOpen);
  const close = useUiStore((s) => s.closeAccountGate);
  const router = useRouter();

  function stayInDemo() {
    close();
  }

  function chooseChallenge() {
    close();
    router.push("/dashboard/challenge/select");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={stayInDemo}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 140,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: T.font,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="account-gate-title"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 480,
              background: T.bgSecondary,
              border: T.hairline(),
              borderRadius: 14,
              padding: 40,
            }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={stayInDemo}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#161616",
                border: T.hairline(),
                borderRadius: 6,
                color: T.textSecondary,
                cursor: "pointer",
              }}
            >
              <IconX size={14} stroke={1.5} />
            </button>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <LeniumMark size={48} variant="green" />
            </div>

            <h2
              id="account-gate-title"
              style={{
                marginTop: 16,
                textAlign: "center",
                color: T.textPrimary,
                fontSize: 22,
                fontWeight: 500,
              }}
            >
              Start a real challenge first
            </h2>

            <p
              style={{
                marginTop: 14,
                textAlign: "center",
                color: T.textSecondary,
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Live trading uses your real funded account. To get there, you need
              to pass a Lenium challenge first. Pick your account size and start
              proving your edge today.
            </p>

            <div
              style={{
                marginTop: 24,
                background: "#161616",
                border: T.hairline(),
                borderRadius: 10,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {STATS.map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: T.textMuted }}>{row.label}</span>
                  <span style={{ color: T.textPrimary }}>{row.value}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 24,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={chooseChallenge}
                style={{
                  width: "100%",
                  height: 48,
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
                Choose your challenge →
              </button>
              <button
                type="button"
                onClick={stayInDemo}
                style={{
                  width: "100%",
                  height: 40,
                  background: "transparent",
                  border: T.hairline(),
                  borderRadius: 8,
                  color: T.textSecondary,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: T.font,
                }}
              >
                Stay in demo mode
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
