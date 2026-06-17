import { NextResponse } from "next/server";
import {
  getConfiguredAuthUrl,
  isGoogleOAuthConfigured,
  resolveAuthUrl,
} from "@/lib/auth-env";

/** Public OAuth diagnostics — client ID is already exposed in browser OAuth URLs. */
export async function GET() {
  const authUrl = resolveAuthUrl();
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const redirectUri = `${authUrl}/api/auth/callback/google`;

  return NextResponse.json({
    ok: isGoogleOAuthConfigured(),
    clientId: clientId || null,
    redirectUri,
    javascriptOrigin: authUrl,
    authUrlConfigured: getConfiguredAuthUrl() ?? null,
    authUrlEffective: authUrl,
    googleConsoleChecklist: {
      redirectUris: [redirectUri, "https://lenium.capital/api/auth/callback/google"],
      javascriptOrigins: [authUrl, "https://lenium.capital"],
      note: "Redirect URIs must match exactly — include /api/auth/callback/google, not just the homepage.",
    },
    ifStillBlocked:
      "OAuth consent screen → Audience: add your Gmail as a Test user, or publish the app to Production.",
  });
}
