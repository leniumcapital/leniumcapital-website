"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PillBadge } from "@/components/ui";
import { TIERS, usd, formatPct } from "@/lib/pricing";

export function TierTeaserGrid() {
  return (
    <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
      {TIERS.map((t) => (
        <motion.div
          key={t.size}
          className="relative"
          whileHover={{ y: -10, scale: 1.05 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
        >
          <Link
            href="/pricing"
            className="block rounded-xl border border-border bg-surface p-5 shadow-sm transition-[border-color,box-shadow,background-color] duration-300 hover:border-brand/50 hover:bg-brand-soft/30 hover:shadow-xl hover:shadow-brand/15"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xl font-semibold tracking-tight">
                {usd(t.size)}
              </span>
              {t.exclusive ? (
                <PillBadge tone="brand">Exclusive</PillBadge>
              ) : t.popular ? (
                <PillBadge tone="brand">Popular</PillBadge>
              ) : null}
            </div>
            <div className="mt-3 text-sm text-muted">
              from{" "}
              <span className="font-semibold text-foreground">${t.fee}</span>
            </div>
            <div className="mt-1 text-xs text-muted">
              {formatPct(t.profitTarget)} profit target
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
