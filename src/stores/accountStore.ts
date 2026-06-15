import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AddonId } from "@/lib/data";

export type AccountType = "challenge" | "funded" | "none";
export type AccountChallengeStatus =
  | "active"
  | "passed"
  | "breached"
  | "expired"
  | "none";

export type BreachReason =
  | "max_drawdown"
  | "expired"
  | "inactivity"
  | "rules_violation"
  | null;

interface AccountState {
  userId: string;
  name: string;
  email: string;
  accountType: AccountType;
  challengeStatus: AccountChallengeStatus;
  tier: number;
  balance: number;
  accountSize: number;
  /** Purchased add-ons for the active account. */
  addons: AddonId[];
  /** Unix ms of last opened position (funded inactivity tracking). */
  lastTradeAt: number | null;
  /** Cumulative opening commissions paid on funded account. */
  commissionsPaid: number;
  breachReason: BreachReason;
  setAccount: (
    account: Partial<
      Pick<
        AccountState,
        | "userId"
        | "name"
        | "email"
        | "accountType"
        | "challengeStatus"
        | "tier"
        | "balance"
        | "accountSize"
        | "addons"
        | "lastTradeAt"
        | "commissionsPaid"
        | "breachReason"
      >
    >,
  ) => void;
  setAddons: (addons: AddonId[]) => void;
  updateBalance: (balance: number) => void;
  setChallengeStatus: (status: AccountChallengeStatus) => void;
  setBreachReason: (reason: BreachReason) => void;
  recordTrade: () => void;
  addCommission: (amount: number) => void;
  reset: () => void;
}

const initial = {
  userId: "",
  name: "",
  email: "",
  accountType: "none" as AccountType,
  challengeStatus: "none" as AccountChallengeStatus,
  tier: 0,
  balance: 0,
  accountSize: 0,
  addons: [] as AddonId[],
  lastTradeAt: null as number | null,
  commissionsPaid: 0,
  breachReason: null as BreachReason,
};

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      ...initial,
      setAccount: (account) => set(account),
      setAddons: (addons) => set({ addons }),
      updateBalance: (balance) => set({ balance }),
      setChallengeStatus: (challengeStatus) => set({ challengeStatus }),
      setBreachReason: (breachReason) => set({ breachReason }),
      recordTrade: () => set({ lastTradeAt: Date.now() }),
      addCommission: (amount) =>
        set((s) => ({ commissionsPaid: s.commissionsPaid + amount })),
      reset: () => set(initial),
    }),
    { name: "lenium-account" },
  ),
);
