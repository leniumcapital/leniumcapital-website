import type { AccountChallengeStatus, AccountType } from "@/stores/accountStore";

/** True when the user has not started a demo or live challenge yet. */
export function needsAccountSetup(input: {
  accountType: AccountType;
  challengeStatus: AccountChallengeStatus;
  hasActiveChallenge: boolean;
  tier: number;
}): boolean {
  if (input.hasActiveChallenge) return false;
  if (input.tier > 0 && input.challengeStatus !== "none") return false;
  return input.accountType === "none" || input.challengeStatus === "none";
}
