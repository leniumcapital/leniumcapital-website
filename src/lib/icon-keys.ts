/**
 * Client-safe icon lookup key normalization and fallback styling.
 */

/** Strip Kalshi formatting, then lowercase alphanumeric + spaces only. */
export function normalizeNameKey(name: string): string {
  let s = name.trim();
  s = s.replace(/\.+$/, "");
  s = s.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  s = s.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/** One or two uppercase initials from a display name. */
export function iconFallbackInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

const CATEGORY_BG: Record<string, string> = {
  Elections: "#1a2744",
  Politics: "#1a2744",
  Sports: "#0d2b1a",
  Crypto: "#2b1a0d",
  Economics: "#1a1a2b",
  Finance: "#1a1a2b",
  Culture: "#1a0d2b",
  Climate: "#0d1f1f",
};

export function iconFallbackColor(category: string): string {
  return CATEGORY_BG[category] ?? "#1C1C1C";
}
