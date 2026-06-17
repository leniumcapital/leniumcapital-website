import { create } from "zustand";
import type { TradingMode, AccountStatusPayload } from "@/lib/account-status";
import type { AddonId } from "@/lib/pricing";
import { effectiveAccountSize } from "@/lib/rules";

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
  dailyLockout: boolean;
  tradingMode: TradingMode;
  hasActiveChallenge: boolean;
  hasFundedAccount: boolean;
  challengeBalance: number;
  fundedBalance: number;
  challengeAccountId: string | null;
  fundedAccountId: string | null;
  challengeTier: number;
  fundedTier: number;
  /** Bumps when trading mode changes so balance can animate over 800ms. */
  balanceEpoch: number;
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
        | "challengeTier"
        | "fundedTier"
        | "addons"
        | "lastTradeAt"
        | "commissionsPaid"
        | "breachReason"
      >
    >,
  ) => void;
  applyAccountStatus: (
    status: Partial<
      Pick<
        AccountState,
        | "tradingMode"
        | "hasActiveChallenge"
        | "hasFundedAccount"
        | "challengeBalance"
        | "fundedBalance"
        | "challengeAccountId"
        | "fundedAccountId"
        | "challengeTier"
        | "fundedTier"
      >
    > &
      Partial<
        Pick<
          AccountStatusPayload,
          "purchasedAddons" | "activeBalance" | "challengePurchasedAddons" | "fundedPurchasedAddons"
        >
      >,
  ) => void;
  setTradingMode: (mode: TradingMode) => boolean;
  setAddons: (addons: AddonId[]) => void;
  updateBalance: (balance: number) => void;
  setChallengeStatus: (status: AccountChallengeStatus) => void;
  setBreachReason: (reason: BreachReason) => void;
  setDailyLockout: (locked: boolean) => void;
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
  dailyLockout: false,
  tradingMode: "demo" as TradingMode,
  hasActiveChallenge: false,
  hasFundedAccount: false,
  challengeBalance: 0,
  fundedBalance: 0,
  challengeAccountId: null as string | null,
  fundedAccountId: null as string | null,
  challengeTier: 0,
  fundedTier: 0,
  balanceEpoch: 0,
  addons: [] as AddonId[],
  lastTradeAt: null as number | null,
  commissionsPaid: 0,
  breachReason: null as BreachReason,
};

function mapDbChallengeStatus(status: string): AccountChallengeStatus {
  switch (status) {
    case "in_progress":
      return "active";
    case "passed":
    case "funded":
      return "passed";
    case "failed":
      return "breached";
    case "expired":
      return "expired";
    default:
      return "none";
  }
}

function applyModeFields(
  state: AccountState,
  mode: TradingMode,
): Partial<AccountState> {
  if (mode === "live" && state.hasFundedAccount) {
    return {
      tradingMode: "live",
      accountType: "funded",
      balance: state.fundedBalance,
      tier: state.fundedTier,
      accountSize: state.fundedTier,
      challengeStatus: "passed",
    };
  }

  return {
    tradingMode: "demo",
    accountType: state.hasActiveChallenge ? "challenge" : "none",
    balance: state.challengeBalance,
    tier: state.challengeTier,
    accountSize: state.challengeTier,
    challengeStatus: state.hasActiveChallenge ? "active" : "none",
  };
}

export const useAccountStore = create<AccountState>()((set, get) => ({
  ...initial,
  setAccount: (account) =>
    set((state) => {
      const next = { ...state, ...account };
      const size = effectiveAccountSize({
        accountSize: next.accountSize,
        tier: next.tier,
        challengeTier: next.challengeTier,
        fundedTier: next.fundedTier,
        tradingMode: next.tradingMode,
      });
      if (size > 0) {
        next.accountSize = size;
        if (!next.tier) next.tier = size;
      }
      return next;
    }),
  applyAccountStatus: (status) => {
    const next = { ...get(), ...status };
    const modeFields = applyModeFields(next, next.tradingMode);

    if (status.purchasedAddons) {
      modeFields.addons = status.purchasedAddons;
    } else if (next.tradingMode === "live" && status.fundedPurchasedAddons) {
      modeFields.addons = status.fundedPurchasedAddons;
    } else if (status.challengePurchasedAddons) {
      modeFields.addons = status.challengePurchasedAddons;
    }

    if (typeof status.activeBalance === "number") {
      if (next.tradingMode === "live") {
        modeFields.fundedBalance = status.activeBalance;
        modeFields.balance = status.activeBalance;
      } else {
        modeFields.challengeBalance = status.activeBalance;
        modeFields.balance = status.activeBalance;
      }
    }

    const merged = { ...next, ...modeFields };
    const size = effectiveAccountSize({
      accountSize: merged.accountSize,
      tier: merged.tier,
      challengeTier: merged.challengeTier,
      fundedTier: merged.fundedTier,
      tradingMode: merged.tradingMode,
    });
    if (size > 0) {
      merged.accountSize = size;
      if (!merged.tier) merged.tier = size;
    }
    set(merged);
  },
  setTradingMode: (mode) => {
    const state = get();
    if (mode === "live" && !state.hasFundedAccount) return false;

    const modeFields = applyModeFields(state, mode);
    set({
      ...modeFields,
      balanceEpoch: state.balanceEpoch + 1,
    });
    return true;
  },
  setAddons: (addons) => set({ addons }),
  updateBalance: (balance) => {
    const state = get();
    if (state.tradingMode === "live") {
      set({ balance, fundedBalance: balance });
    } else {
      set({ balance, challengeBalance: balance });
    }
  },
  setChallengeStatus: (challengeStatus) => set({ challengeStatus }),
  setBreachReason: (breachReason) => set({ breachReason }),
  setDailyLockout: (dailyLockout) => set({ dailyLockout }),
  recordTrade: () => set({ lastTradeAt: Date.now() }),
  addCommission: (amount) =>
    set((s) => ({ commissionsPaid: s.commissionsPaid + amount })),
  reset: () => set(initial),
}));

export { mapDbChallengeStatus };

/** Active trading account id for the current demo/live mode. */
export function activeAccountId(state: Pick<
  AccountState,
  "tradingMode" | "challengeAccountId" | "fundedAccountId"
>): string | null {
  if (state.tradingMode === "live" && state.fundedAccountId) {
    return state.fundedAccountId;
  }
  return state.challengeAccountId;
}
