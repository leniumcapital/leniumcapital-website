import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import {
  isGoogleOAuthConfigured,
  syncAuthUrlEnv,
} from "@/lib/auth-env";
import { upsertGoogleUser, verifyCredentials } from "@/lib/auth-db";
import type { SessionUserPayload } from "@/lib/auth-db";
import type { AccountType, ChallengeStatus } from "@/lib/users";
import type { TradingMode } from "@/lib/account-status";
import { safeCallbackUrl } from "@/lib/callback-url";

// Auth.js reads AUTH_URL when building OAuth sign-in/callback URLs exposed to the client.
syncAuthUrlEnv();

type GoogleProfile = {
  email?: string | null;
  email_verified?: boolean;
  picture?: string | null;
  name?: string | null;
};

function applySessionUserToToken(
  token: Record<string, unknown>,
  payload: SessionUserPayload,
  isNewUser?: boolean,
) {
  token.uid = payload.id;
  token.accountType = payload.accountType;
  token.tier = payload.tier;
  token.challengeStatus = payload.challengeStatus;
  token.balance = payload.balance;
  token.hasActiveChallenge = payload.hasActiveChallenge;
  token.hasFundedAccount = payload.hasFundedAccount;
  token.tradingMode = payload.tradingMode;
  if (typeof isNewUser === "boolean") token.isNewUser = isNewUser;
}

const providers: Provider[] = [];

if (isGoogleOAuthConfigured()) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

providers.push(
  Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "");
        const password = String(credentials?.password ?? "");
        const user = await verifyCredentials(email, password);
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          accountType: user.accountType,
          tier: user.tier,
          challengeStatus: user.challengeStatus,
          balance: user.balance,
          hasActiveChallenge: user.hasActiveChallenge,
          hasFundedAccount: user.hasFundedAccount,
          tradingMode: user.tradingMode,
        };
      },
    }),
);

const authSecret =
  process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  ...(authSecret ? { secret: authSecret } : {}),
  session: { strategy: "jwt" },
  pages: {
    // Do not embed query strings — Auth.js appends ?error= with a second "?" otherwise.
    signIn: "/signup",
    error: "/signup",
  },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const googleProfile = profile as GoogleProfile | undefined;
      const email = user.email ?? googleProfile?.email ?? null;
      if (!email) {
        console.error("Google sign-in rejected: profile did not include an email.");
        return "/signup?error=AccessDenied";
      }

      try {
        const result = await upsertGoogleUser({
          email,
          name: user.name ?? googleProfile?.name,
          image: user.image ?? googleProfile?.picture,
        });

        user.id = result.user.id;
        user.name = result.user.name;
        user.email = result.user.email;
        user.accountType = result.user.accountType;
        user.tier = result.user.tier;
        user.challengeStatus = result.user.challengeStatus;
        user.balance = result.user.balance;
        user.hasActiveChallenge = result.user.hasActiveChallenge;
        user.hasFundedAccount = result.user.hasFundedAccount;
        user.tradingMode = result.user.tradingMode;
        user.isNewUser = result.isNewUser;
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code: unknown }).code)
            : undefined;
        console.error("Google sign-in database error:", { code, email, error });
        return "/signup?error=OAuthCallback";
      }

      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user && account?.provider === "google") {
        applySessionUserToToken(
          token,
          {
            id: user.id as string,
            email: user.email ?? "",
            name: user.name ?? "",
            accountType: (user.accountType as AccountType) ?? "challenge",
            tier: user.tier ?? 0,
            challengeStatus:
              (user.challengeStatus as ChallengeStatus) ?? "pending",
            balance: user.balance ?? 0,
            hasActiveChallenge: user.hasActiveChallenge ?? false,
            hasFundedAccount: user.hasFundedAccount ?? false,
            tradingMode: (user.tradingMode as TradingMode) ?? "demo",
          },
          user.isNewUser,
        );
        return token;
      }

      if (user) {
        applySessionUserToToken(
          token,
          {
            id: user.id as string,
            email: user.email ?? "",
            name: user.name ?? "",
            accountType: (user.accountType as AccountType) ?? "challenge",
            tier: user.tier ?? 0,
            challengeStatus: (user.challengeStatus as ChallengeStatus) ?? "pending",
            balance: user.balance ?? 0,
            hasActiveChallenge: user.hasActiveChallenge ?? false,
            hasFundedAccount: user.hasFundedAccount ?? false,
            tradingMode: (user.tradingMode as TradingMode) ?? "demo",
          },
          user.isNewUser,
        );
      }

      if (trigger === "update" && session) {
        const s = session as {
          tier?: number;
          balance?: number;
          accountType?: AccountType;
          challengeStatus?: ChallengeStatus;
          hasActiveChallenge?: boolean;
          hasFundedAccount?: boolean;
          tradingMode?: TradingMode;
          user?: {
            tier?: number;
            balance?: number;
            accountType?: AccountType;
            challengeStatus?: ChallengeStatus;
            hasActiveChallenge?: boolean;
            hasFundedAccount?: boolean;
            tradingMode?: TradingMode;
          };
        };
        const patch = s.user ?? s;
        if (patch.tier !== undefined) token.tier = patch.tier;
        if (patch.balance !== undefined) token.balance = patch.balance;
        if (patch.accountType !== undefined) token.accountType = patch.accountType;
        if (patch.challengeStatus !== undefined) {
          token.challengeStatus = patch.challengeStatus;
        }
        if (patch.hasActiveChallenge !== undefined) {
          token.hasActiveChallenge = patch.hasActiveChallenge;
        }
        if (patch.hasFundedAccount !== undefined) {
          token.hasFundedAccount = patch.hasFundedAccount;
        }
        if (patch.tradingMode !== undefined) token.tradingMode = patch.tradingMode;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.accountType =
          (token.accountType as AccountType) ?? "challenge";
        session.user.tier = (token.tier as number) ?? 0;
        session.user.challengeStatus =
          (token.challengeStatus as ChallengeStatus) ?? "pending";
        session.user.balance = (token.balance as number) ?? 0;
        session.user.hasActiveChallenge =
          (token.hasActiveChallenge as boolean) ?? false;
        session.user.hasFundedAccount =
          (token.hasFundedAccount as boolean) ?? false;
        session.user.tradingMode = (token.tradingMode as TradingMode) ?? "demo";
        session.user.isNewUser = (token.isNewUser as boolean) ?? false;
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        // Auth error/success pages must pass through (safeCallbackUrl blocks /signup).
        if (url.startsWith("/signup")) return `${baseUrl}${url}`;
        return `${baseUrl}${safeCallbackUrl(url, "/dashboard")}`;
      }

      try {
        const parsed = new URL(url);
        if (parsed.origin === baseUrl) {
          const path = `${parsed.pathname}${parsed.search}`;
          if (path.startsWith("/signup")) return url;
          return `${baseUrl}${safeCallbackUrl(path, "/dashboard")}`;
        }
      } catch {
        /* ignore */
      }

      return `${baseUrl}/dashboard`;
    },
  },
});
