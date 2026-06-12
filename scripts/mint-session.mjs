// Dev-only helper: mints a valid Auth.js session cookie for local testing
// (bypasses the DB, which local dev has no credentials for).
import { encode } from "next-auth/jwt";
import { readFileSync } from "node:fs";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const secret = env.match(/^AUTH_SECRET="?([^"\n]+)"?/m)?.[1];
if (!secret) throw new Error("AUTH_SECRET not found in .env.local");

const token = await encode({
  token: {
    name: "Test User",
    email: "agent-test@lenium.dev",
    sub: "local-test-user",
    uid: "local-test-user",
    accountType: "challenge",
    tier: 1,
    challengeStatus: "active",
    balance: 25000,
  },
  secret,
  salt: "authjs.session-token",
  maxAge: 24 * 60 * 60,
});

console.log(token);
