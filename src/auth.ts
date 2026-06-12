import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import { verifyCredentials, findOrCreateOAuthUser } from "@/lib/auth-db";
import type { AccountType, ChallengeStatus } from "@/lib/users";

/** True when the env credentials for an OAuth provider are configured. */
export const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);
export const appleEnabled = Boolean(
  process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET,
);

const providers: Provider[] = [
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
];

// OAuth providers are only registered when their credentials exist, so a
// missing setup can never break email/password login.
if (googleEnabled) providers.push(Google);
if (appleEnabled) providers.push(Apple);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    signIn({ account, profile }) {
      // Google asserts email ownership via email_verified; reject otherwise.
      if (account?.provider === "google") {
        return profile?.email_verified === true;
      }
      // Apple only issues verified emails. Credentials are checked in authorize.
      return true;
    },

    // Persist the account state into the signed JWT at sign-in time so it can
    // be read from the session on every request without re-fetching.
    async jwt({ token, user, account }) {
      const provider = account?.provider;

      if (provider === "google" || provider === "apple") {
        // OAuth sign-in: resolve (or create) our own DB user by email, then
        // store OUR user id and account state — never the provider's id.
        const email = token.email ?? user?.email;
        if (!email) return token;
        const dbUser = await findOrCreateOAuthUser(
          email,
          token.name ?? user?.name,
          provider,
        );
        token.uid = dbUser.id;
        token.name = dbUser.name;
        token.accountType = dbUser.accountType;
        token.tier = dbUser.tier;
        token.challengeStatus = dbUser.challengeStatus;
        token.balance = dbUser.balance;
        return token;
      }

      if (user) {
        token.uid = user.id as string;
        token.accountType = user.accountType;
        token.tier = user.tier;
        token.challengeStatus = user.challengeStatus;
        token.balance = user.balance;
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
