/** Default post-auth destination for challenge purchase flow. */
export const CHALLENGE_SELECT_PATH = "/dashboard/challenge/select";

const DEFAULT_CALLBACK = CHALLENGE_SELECT_PATH;

/** Reject open redirects — only allow same-site relative paths. */
export function safeCallbackUrl(
  raw: string | null | undefined,
  fallback = DEFAULT_CALLBACK,
): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.startsWith("/login") || value.startsWith("/signup")) return fallback;
  return value;
}

export function loginWithCallback(callbackUrl = DEFAULT_CALLBACK): string {
  const params = new URLSearchParams({
    callbackUrl: safeCallbackUrl(callbackUrl),
  });
  return `/login?${params.toString()}`;
}
