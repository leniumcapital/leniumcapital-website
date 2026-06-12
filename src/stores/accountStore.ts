import { create } from "zustand";

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
  /** True when the daily loss limit has been hit — trading locked until midnight UTC. */
  dailyLockout: boolean;
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
};

export const useAccountStore = create<AccountState>()((set) => ({
  ...initial,
  setAccount: (account) => set(account),
  updateBalance: (balance) => set({ balance }),
  setChallengeStatus: (challengeStatus) => set({ challengeStatus }),
  setDailyLockout: (dailyLockout) => set({ dailyLockout }),
  reset: () => set(initial),
}));
