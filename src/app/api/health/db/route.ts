import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  authConfigIssues,
  getConfiguredAuthUrl,
  isAuthFullyConfigured,
  isAuthSecretConfigured,
  isAuthUrlMisconfiguredOnProduction,
  isGoogleOAuthConfigured,
  resolveAuthUrl,
} from "@/lib/auth-env";

/** Quick check that the app can reach Supabase. Visit /api/health/db to test. */
export async function GET() {
  const authSecretSet = isAuthSecretConfigured();
  const authUrlConfigured = getConfiguredAuthUrl();
  const authUrlEffective = resolveAuthUrl();
  const authUrlMisconfigured = isAuthUrlMisconfiguredOnProduction();
  const authFullyConfigured = isAuthFullyConfigured();
  const googleOAuthConfigured = isGoogleOAuthConfigured();
  const authIssues = authConfigIssues();
  const hasDbUrl = Boolean(
    process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL,
  );

  try {
    await prisma.$queryRaw`SELECT 1`;
    const users = await prisma.user.count();
    return NextResponse.json({
      ok: true,
      users,
      authSecretSet,
      authUrlConfigured: authUrlConfigured ?? null,
      authUrlEffective,
      authUrlMisconfigured,
      authFullyConfigured,
      authIssues,
      googleOAuthConfigured,
      hasDbUrl,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown database error";
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: unknown }).code)
        : undefined;
    console.error("DB health check failed:", e);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        code,
        authSecretSet,
        authUrlConfigured: authUrlConfigured ?? null,
        authUrlEffective,
        authUrlMisconfigured,
        authFullyConfigured,
        authIssues,
        googleOAuthConfigured,
        hasDbUrl,
      },
      { status: 500 },
    );
  }
}
