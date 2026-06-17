import "server-only";

/** Production canonical origin — used when AUTH_URL is missing or still set to localhost. */
export const PRODUCTION_AUTH_URL = "https://lenium.capital";

/** True when Google OAuth credentials are present and non-empty. */
export function isGoogleOAuthConfigured(): boolean {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return Boolean(clientId && clientSecret);
}

function isProductionDeploy(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function isLocalhostUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/** Raw value from env — may be wrong on Vercel if copied from .env.local. */
export function getConfiguredAuthUrl(): string | undefined {
  const url = process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  return url || undefined;
}

/**
 * Canonical public URL for Auth.js OAuth callbacks and session cookies.
 * On production, never use localhost even if AUTH_URL was pasted incorrectly.
 */
export function resolveAuthUrl(): string {
  const configured = getConfiguredAuthUrl();

  if (isProductionDeploy()) {
    if (!configured || isLocalhostUrl(configured)) {
      return PRODUCTION_AUTH_URL;
    }
    return configured.replace(/\/$/, "");
  }

  return configured?.replace(/\/$/, "") ?? "http://localhost:3000";
}

/** @deprecated Use resolveAuthUrl() — kept for callers expecting optional string. */
export function getAuthUrl(): string | undefined {
  return resolveAuthUrl();
}

/** Apply resolved URL so Auth.js provider metadata uses the correct host. */
export function syncAuthUrlEnv(): string {
  const resolved = resolveAuthUrl();
  process.env.AUTH_URL = resolved;
  process.env.NEXTAUTH_URL = resolved;
  return resolved;
}

export function isAuthSecretConfigured(): boolean {
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  return Boolean(secret);
}

export function isAuthFullyConfigured(): boolean {
  return isAuthSecretConfigured() && Boolean(getConfiguredAuthUrl() || isProductionDeploy());
}

export function authConfigIssues(): string[] {
  const issues: string[] = [];
  if (!isAuthSecretConfigured()) {
    issues.push("AUTH_SECRET is missing");
  }
  const configured = getConfiguredAuthUrl();
  if (!configured && !isProductionDeploy()) {
    issues.push("AUTH_URL is missing (set to http://localhost:3000 locally)");
  }
  if (isProductionDeploy() && configured && isLocalhostUrl(configured)) {
    issues.push(
      "AUTH_URL is set to localhost on production — update Vercel to https://lenium.capital",
    );
  }
  return issues;
}

export function isAuthUrlMisconfiguredOnProduction(): boolean {
  const configured = getConfiguredAuthUrl();
  return isProductionDeploy() && Boolean(configured && isLocalhostUrl(configured));
}
