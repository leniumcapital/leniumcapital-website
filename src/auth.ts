import NextAuth from "next-auth";
import { cookies } from "next/headers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { upsertGoogleUser, verifyCredentials } from "@/lib/auth-db";
import type { AccountType, ChallengeStatus } from "@/lib/users";
import type { TradingMode } from "@/lib/account-status";

const POST_AUTH_COOKIE = "lenium_post_auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/signup?mode=login" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
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
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      const email = user.email;
      if (!email) return false;

      const result = await upsertGoogleUser({
        email,
        name: user.name,
        image: user.image,
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

      const cookieStore = await cookies();
      cookieStore.set(
        POST_AUTH_COOKIE,
        result.isNewUser ? "/pricing" : "/dashboard/markets",
        { maxAge: 120, path: "/", sameSite: "lax" },
      );

      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.uid = user.id as string;
        token.accountType = user.accountType;
        token.tier = user.tier;
        token.challengeStatus = user.challengeStatus;
        token.balance = user.balance;
        token.hasActiveChallenge = user.hasActiveChallenge;
        token.hasFundedAccount = user.hasFundedAccount;
        token.tradingMode = user.tradingMode;
        token.isNewUser = user.isNewUser;
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
    async redirect({ url, baseUrl }) {
      const cookieStore = await cookies();
      const postAuth = cookieStore.get(POST_AUTH_COOKIE)?.value;
      if (postAuth?.startsWith("/")) {
        cookieStore.delete(POST_AUTH_COOKIE);
        return `${baseUrl}${postAuth}`;
      }

      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
});
