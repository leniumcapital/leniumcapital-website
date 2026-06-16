import type { DefaultSession } from "next-auth";
import type { TradingMode } from "@/lib/account-status";
import type { AccountType, ChallengeStatus } from "@/lib/users";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      accountType: AccountType;
      tier: number;
      challengeStatus: ChallengeStatus;
      balance: number;
      hasActiveChallenge: boolean;
      hasFundedAccount: boolean;
      tradingMode: TradingMode;
      isNewUser: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    accountType?: AccountType;
    tier?: number;
    challengeStatus?: ChallengeStatus;
    balance?: number;
    hasActiveChallenge?: boolean;
    hasFundedAccount?: boolean;
    tradingMode?: TradingMode;
    isNewUser?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    accountType?: AccountType;
    tier?: number;
    challengeStatus?: ChallengeStatus;
    balance?: number;
    hasActiveChallenge?: boolean;
    hasFundedAccount?: boolean;
    tradingMode?: TradingMode;
    isNewUser?: boolean;
  }
}
