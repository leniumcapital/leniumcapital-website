import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials } from "@/lib/auth-db";
import type { AccountType, ChallengeStatus } from "@/lib/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
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
        // Only non-secret, session-safe fields are returned here.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          accountType: user.accountType,
          tier: user.tier,
          challengeStatus: user.challengeStatus,
          balance: user.balance,
        };
      },
    }),
  ],
  callbacks: {
    // Persist the account state into the signed JWT at sign-in time so it can
    // be read from the session on every request without re-fetching.
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.uid = user.id as string;
        token.accountType = user.accountType;
        token.tier = user.tier;
        token.challengeStatus = user.challengeStatus;
        token.balance = user.balance;
      }

      if (trigger === "update" && session?.user) {
        const u = session.user as {
          accountType?: AccountType;
          tier?: number;
          challengeStatus?: ChallengeStatus;
          balance?: number;
        };
        if (u.accountType !== undefined) token.accountType = u.accountType;
        if (u.tier !== undefined) token.tier = u.tier;
        if (u.challengeStatus !== undefined) {
          token.challengeStatus = u.challengeStatus;
        }
        if (u.balance !== undefined) token.balance = u.balance;
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
      }
      return session;
    },
  },
});
