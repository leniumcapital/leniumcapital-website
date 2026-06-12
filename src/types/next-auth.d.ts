import type { DefaultSession } from "next-auth";
import type { AccountType, ChallengeStatus } from "@/lib/users";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      accountType: AccountType;
      tier: number;
      challengeStatus: ChallengeStatus;
      balance: number;
    } & DefaultSession["user"];
  }

  interface User {
    accountType?: AccountType;
    tier?: number;
    challengeStatus?: ChallengeStatus;
    balance?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    accountType?: AccountType;
    tier?: number;
    challengeStatus?: ChallengeStatus;
    balance?: number;
  }
}
