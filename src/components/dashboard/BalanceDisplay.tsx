"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useSpring,
  useTransform,
  animate,
  useMotionValue,
} from "framer-motion";
import { useAccountStore } from "@/stores/accountStore";
import { T } from "@/lib/tokens";

/** Animated account balance: springs between values, flashes green/red. */
export function BalanceDisplay() {
  const balance = useAccountStore((s) => s.balance);
  const prevRef = useRef(balance);
  const [, force] = useState(0);

  const spring = useSpring(balance, { stiffness: 100, damping: 20 });
  const display = useTransform(spring, (v) =>
    `$${v.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
  );

  const colorValue = useMotionValue<string>(T.textPrimary);

  useEffect(() => {
    spring.set(balance);
    const prev = prevRef.current;
    if (balance !== prev) {
      const flash = balance > prev ? T.green : T.red;
      colorValue.set(flash);
      const controls = animate(colorValue, T.textPrimary, {
        duration: 0.6,
        ease: "easeOut",
      });
      prevRef.current = balance;
      force((n) => n + 1);
      return () => controls.stop();
    }
    prevRef.current = balance;
  }, [balance, spring, colorValue]);

  return (
    <motion.span
      style={{
        color: colorValue,
        fontSize: 16,
        fontWeight: 500,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {display}
    </motion.span>
  );
}
