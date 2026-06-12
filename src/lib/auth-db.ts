import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { AccountType, ChallengeStatus } from "@/lib/users";

const BCRYPT_ROUNDS = 12;

export type SessionUserPayload = {
  id: string;
  email: string;
  name: string;
  accountType: AccountType;
  tier: number;
  challengeStatus: ChallengeStatus;
  balance: number;
};

/** Default session state for a user who signed up but has no challenge yet. */
const PENDING_ACCOUNT: Pick<
  SessionUserPayload,
  "accountType" | "tier" | "challengeStatus" | "balance"
> = {
  accountType: "challenge",
  tier: 0,
  challengeStatus: "pending",
  balance: 0,
};

function toSessionPayload(
  user: { id: string; email: string; name: string },
  account?: {
    accountType: string;
    tier: number;
    balance: number;
    challengeStatus: string;
  } | null,
): SessionUserPayload {
  if (!account) {
    return { ...user, ...PENDING_ACCOUNT };
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    accountType: account.accountType as AccountType,
    tier: account.tier,
    balance: account.balance,
    challengeStatus: account.challengeStatus as ChallengeStatus,
  };
}

/** Look up a user by email + password. Returns null on bad credentials. */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<SessionUserPayload | null> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    include: {
      accounts: { where: { isPrimary: true }, take: 1 },
    },
  });
  if (!user) return null;

  // OAuth-created accounts have no password — they must use Google/Apple.
  if (!user.password) return null;

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;

  return toSessionPayload(user, user.accounts[0] ?? null);
}

export type SignupResult =
  | { ok: true; user: SessionUserPayload }
  | { ok: false; error: string };

/** Create a new user. Does not require payment — no trading account until checkout. */
export async function createUser(
  name: string,
  email: string,
  password: string,
): Promise<SignupResult> {
  const trimmedName = name.trim();
  const normalized = email.trim().toLowerCase();

  if (!trimmedName) return { ok: false, error: "Name is required." };
  if (!normalized || !normalized.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalized },
  });
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: normalized,
      name: trimmedName,
      password: hash,
    },
  });

  return {
    ok: true,
    user: toSessionPayload(user, null),
  };
}

/**
 * Find or create a user for a Google/Apple sign-in. Called from the NextAuth
 * jwt callback the first time an OAuth token is issued. If a credentials
 * account already exists with the same (verified) email, the login links to
 * it — same person, same trading account.
 */
export async function findOrCreateOAuthUser(
  email: string,
  name: string | null | undefined,
  provider: "google" | "apple",
): Promise<SessionUserPayload> {
  const normalized = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalized },
    include: { accounts: { where: { isPrimary: true }, take: 1 } },
  });
  if (existing) {
    return toSessionPayload(existing, existing.accounts[0] ?? null);
  }

  const user = await prisma.user.create({
    data: {
      email: normalized,
      name: name?.trim() || normalized.split("@")[0],
      password: null,
      authProvider: provider,
    },
  });
  return toSessionPayload(user, null);
}

/** Attach a trading account to an existing user (used after challenge purchase). */
export async function createTradingAccount(
  userId: string,
  data: {
    accountType: AccountType;
    tier: number;
    balance: number;
    challengeStatus: ChallengeStatus;
  },
) {
  return prisma.tradingAccount.create({
    data: {
      userId,
      accountType: data.accountType,
      tier: data.tier,
      balance: data.balance,
      challengeStatus: data.challengeStatus,
      isPrimary: true,
    },
  });
}
