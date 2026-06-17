import "server-only";

/** True when Google OAuth credentials are present and non-empty. */
export function isGoogleOAuthConfigured(): boolean {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return Boolean(clientId && clientSecret);
}

/** Canonical public URL used by Auth.js for cookies and callbacks. */
export function getAuthUrl(): string | undefined {
  const url = process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  return url || undefined;
}

export function isAuthSecretConfigured(): boolean {
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  return Boolean(secret);
}

/** Both secret and public URL must be set for reliable sessions in production. */
export function isAuthFullyConfigured(): boolean {
  return isAuthSecretConfigured() && Boolean(getAuthUrl());
}

export function authConfigIssues(): string[] {
  const issues: string[] = [];
  if (!isAuthSecretConfigured()) {
    issues.push("AUTH_SECRET is missing");
  }
  if (!getAuthUrl()) {
    issues.push("AUTH_URL is missing (set to https://lenium.capital in production)");
  }
  return issues;
}
