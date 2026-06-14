"use client";

import { useEffect, useRef } from "react";
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
  const balanceEpoch = useAccountStore((s) => s.balanceEpoch);
  const prevRef = useRef(balance);
  const prevEpochRef = useRef(balanceEpoch);
  const forceRender = useRef(0);

  const spring = useSpring(balance, { stiffness: 50, damping: 18 });
  const display = useTransform(spring, (v) =>
    `$${v.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
  );

  const colorValue = useMotionValue<string>(T.textPrimary);

  useEffect(() => {
    const prev = prevRef.current;
    const modeSwitch = balanceEpoch !== prevEpochRef.current;

    if (modeSwitch) {
      prevEpochRef.current = balanceEpoch;
      const controls = animate(spring, balance, {
        duration: 0.8,
        ease: "easeInOut",
      });
      prevRef.current = balance;
      forceRender.current += 1;
      return () => controls.stop();
    }

    spring.set(balance);
    if (balance !== prev) {
      const flash = balance > prev ? T.green : T.red;
      colorValue.set(flash);
      const controls = animate(colorValue, T.textPrimary, {
        duration: 0.6,
        ease: "easeOut",
      });
      prevRef.current = balance;
      forceRender.current += 1;
      return () => controls.stop();
    }
    prevRef.current = balance;
  }, [balance, balanceEpoch, spring, colorValue]);

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
