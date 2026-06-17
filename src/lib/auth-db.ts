import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { TradingMode } from "@/lib/account-status";
import type { AccountType, ChallengeStatus } from "@/lib/users";

const BCRYPT_ROUNDS = 12;

const ACTIVE_CHALLENGE_STATUSES = new Set(["in_progress", "passed"]);

export type SessionUserPayload = {
  id: string;
  email: string;
  name: string;
  accountType: AccountType;
  tier: number;
  challengeStatus: ChallengeStatus;
  balance: number;
  hasActiveChallenge: boolean;
  hasFundedAccount: boolean;
  tradingMode: TradingMode;
};

/** Default session state for a user who signed up but has no challenge yet. */
const PENDING_ACCOUNT: Pick<
  SessionUserPayload,
  | "accountType"
  | "tier"
  | "challengeStatus"
  | "balance"
  | "hasActiveChallenge"
  | "hasFundedAccount"
  | "tradingMode"
> = {
  accountType: "challenge",
  tier: 0,
  challengeStatus: "pending",
  balance: 0,
  hasActiveChallenge: false,
  hasFundedAccount: false,
  tradingMode: "demo",
};

function deriveAccountFlags(
  accounts: Array<{
    accountType: string;
    tier: number;
    challengeStatus: string;
  }>,
): Pick<
  SessionUserPayload,
  "hasActiveChallenge" | "hasFundedAccount" | "tradingMode"
> {
  const challengeAccount = accounts.find(
    (a) =>
      a.accountType === "challenge" &&
      a.tier > 0 &&
      ACTIVE_CHALLENGE_STATUSES.has(a.challengeStatus),
  );
  const fundedAccount = accounts.find(
    (a) => a.accountType === "funded" && a.challengeStatus === "funded",
  );

  return {
    hasActiveChallenge: Boolean(challengeAccount),
    hasFundedAccount: Boolean(fundedAccount),
    tradingMode: fundedAccount ? "live" : "demo",
  };
}

function toSessionPayload(
  user: { id: string; email: string; name: string },
  account?: {
    accountType: string;
    tier: number;
    balance: number;
    challengeStatus: string;
  } | null,
  allAccounts: Array<{
    accountType: string;
    tier: number;
    challengeStatus: string;
  }> = [],
): SessionUserPayload {
  const flags = deriveAccountFlags(allAccounts);

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
    ...flags,
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
  });
  if (!user) return null;

  if (!user.password) return null;

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;

  const accounts = await loadTradingAccountsForUser(user.id);
  const primary = accounts.find((a) => a.isPrimary) ?? accounts[0] ?? null;
  return toSessionPayload(user, primary, accounts);
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
    user: toSessionPayload(user, null, []),
  };
}

export type GoogleUpsertResult = {
  user: SessionUserPayload;
  isNewUser: boolean;
};

function sanitizeAvatarUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("https://")) return null;
  return trimmed.slice(0, 2048);
}

function sanitizeDisplayName(
  name: string | null | undefined,
  email: string,
): string {
  const fromName = name?.trim();
  if (fromName) return fromName.slice(0, 120);
  const local = email.split("@")[0]?.trim();
  return (local || "Trader").slice(0, 120);
}

/** Load trading accounts without failing Google/email sign-in on schema drift. */
async function loadTradingAccountsForUser(userId: string) {
  try {
    return await prisma.tradingAccount.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    console.error("Could not load trading accounts during sign-in:", error);
    return [];
  }
}

function prismaErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return undefined;
}

/** Create or update a user from a Google OAuth profile. */
export async function upsertGoogleUser(profile: {
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<GoogleUpsertResult> {
  const normalized = profile.email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw new Error("Google account did not provide a valid email.");
  }

  const displayName = sanitizeDisplayName(profile.name, normalized);
  const avatarUrl = sanitizeAvatarUrl(profile.image);

  const existing = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true },
  });

  let user;
  try {
    user = await prisma.user.upsert({
      where: { email: normalized },
      create: {
        email: normalized,
        name: displayName,
        avatarUrl,
      },
      update: {
        name: displayName,
        ...(avatarUrl ? { avatarUrl } : {}),
      },
    });
  } catch (error) {
    const code = prismaErrorCode(error);
    console.error("Google upsert failed:", { code, email: normalized, error });
    if (code === "P2002") {
      user = await prisma.user.findUniqueOrThrow({
        where: { email: normalized },
      });
    } else {
      throw error;
    }
  }

  const accounts = await loadTradingAccountsForUser(user.id);
  const primary = accounts.find((a) => a.isPrimary) ?? accounts[0] ?? null;

  return {
    user: toSessionPayload(user, primary, accounts),
    isNewUser: !existing,
  };
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
