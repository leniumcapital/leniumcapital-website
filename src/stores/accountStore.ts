import { create } from "zustand";
import type { TradingMode } from "@/lib/account-status";

export type AccountType = "challenge" | "funded" | "none";
export type AccountChallengeStatus = "active" | "passed" | "breached" | "none";

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
    >,
  ) => void;
  setTradingMode: (mode: TradingMode) => boolean;
  updateBalance: (balance: number) => void;
  setChallengeStatus: (status: AccountChallengeStatus) => void;
  setDailyLockout: (locked: boolean) => void;
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
  setAccount: (account) => set(account),
  applyAccountStatus: (status) => {
    const next = { ...get(), ...status };
    const modeFields = applyModeFields(next, next.tradingMode);
    set({ ...next, ...modeFields });
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
  updateBalance: (balance) => {
    const state = get();
    if (state.tradingMode === "live") {
      set({ balance, fundedBalance: balance });
    } else {
      set({ balance, challengeBalance: balance });
    }
  },
  setChallengeStatus: (challengeStatus) => set({ challengeStatus }),
  setDailyLockout: (dailyLockout) => set({ dailyLockout }),
  reset: () => set(initial),
}));

export { mapDbChallengeStatus };
