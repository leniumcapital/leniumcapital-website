/**
 * Seeded demo accounts. There is no database in this build — these records are
 * the single source of truth for credential auth and for the account state the
 * session carries (account type, tier, challenge status, balance).
 *
 * DEMO ONLY: passwords are stored in plaintext here purely so the demo login
 * works. A real deployment would hash + store these in a database.
 */

export type AccountType = "challenge" | "funded";

export type ChallengeStatus =
  | "in_progress"
  | "passed"
  | "failed"
  | "funded";

export type DemoUser = {
  id: string;
  email: string;
  password: string;
  name: string;
  accountType: AccountType;
  /** Account size in dollars, e.g. 25000. */
  tier: number;
  challengeStatus: ChallengeStatus;
  /** Current account balance in dollars. */
  balance: number;
};

export const DEMO_USERS: DemoUser[] = [
  {
    id: "u_challenge_25k",
    email: "trader@lenium.capital",
    password: "demo1234",
    name: "Demo Trader",
    accountType: "challenge",
    tier: 25000,
    challengeStatus: "in_progress",
    balance: 26840,
  },
  {
    id: "u_funded_50k",
    email: "funded@lenium.capital",
    password: "demo1234",
    name: "Funded Pro",
    accountType: "funded",
    tier: 50000,
    challengeStatus: "funded",
    balance: 52840,
  },
];

/** Returns the matching user for a credential pair, or null. */
export function verifyUser(email: string, password: string): DemoUser | null {
  const normalized = email.trim().toLowerCase();
  const user = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === normalized && u.password === password,
  );
  return user ?? null;
}

/** Human label for a challenge status, used across the dashboard UI. */
export function challengeStatusLabel(status: ChallengeStatus): string {
  switch (status) {
    case "in_progress":
      return "Challenge in progress";
    case "passed":
      return "Challenge passed";
    case "failed":
      return "Challenge failed";
    case "funded":
      return "Funded · live";
  }
}
