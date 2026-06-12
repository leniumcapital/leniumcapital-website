/** Shared account/session types used across auth, dashboard, and the DB layer. */

export type AccountType = "challenge" | "funded";

export type ChallengeStatus =
  | "pending"
  | "in_progress"
  | "passed"
  | "failed"
  | "funded";

/** Human label for a challenge status, used across the dashboard UI. */
export function challengeStatusLabel(status: ChallengeStatus): string {
  switch (status) {
    case "pending":
      return "No active challenge";
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
