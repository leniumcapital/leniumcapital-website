/**
 * Shared option-image utilities — initials, colors, and category routing.
 * Safe to import from client and server code.
 */

/** Palette for initials circles when no explicit outcome color is provided. */
export const OPTION_AVATAR_COLORS = [
  "#1E3A5F",
  "#3D2E4F",
  "#1F4038",
  "#4A3320",
  "#3A2030",
  "#27384D",
  "#2D4A3E",
  "#4A2D3D",
] as const;

export type ImageResolveStrategy =
  | "sports"
  | "politics"
  | "crypto"
  | "country"
  | "none";

/** Two-character uppercase initials for any option label. */
export function optionInitials(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const w = parts[0];
    return (w.length >= 2 ? w.slice(0, 2) : w).toUpperCase();
  }
  if (parts.length >= 3) {
    // "San Antonio Spurs" → SA
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  // "Marco Rubio", "New Zealand" → MR, NZ
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Background color for an initials circle. */
export function optionColor(
  name: string,
  explicitColor?: string,
  index?: number,
): string {
  if (explicitColor) return explicitColor;
  if (index != null && index >= 0) {
    return OPTION_AVATAR_COLORS[index % OPTION_AVATAR_COLORS.length];
  }
  return OPTION_AVATAR_COLORS[hashString(name) % OPTION_AVATAR_COLORS.length];
}

/** Which external lookup strategy to use for a market category + label. */
export function imageResolveStrategy(
  category: string,
  name: string,
): ImageResolveStrategy {
  const c = category.toLowerCase();
  const n = name.toLowerCase();

  if (c === "sports") return "sports";
  if (
    c === "crypto" ||
    /\b(btc|bitcoin|eth|ethereum|sol|doge|xrp|crypto)\b/i.test(n)
  ) {
    return "crypto";
  }
  if (
    c === "politics" ||
    c === "elections" ||
    c === "mentions" ||
    /\b(president|senate|governor|candidate|nominee|congress)\b/i.test(n)
  ) {
    return "politics";
  }
  if (countryIso2FromName(name)) return "country";

  // Economics, climate abstracts, culture without a lookup target, etc.
  if (
    c === "economics" ||
    c === "finance" ||
    c === "commodities" ||
    c === "climate"
  ) {
    return "none";
  }

  if (c === "culture") return "politics";
  return "none";
}

/** Cache key for resolved image URLs. */
export function optionImageCacheKey(
  category: string,
  name: string,
  ticker?: string,
): string {
  const base = `${category}:${name.trim().toLowerCase()}`;
  return ticker ? `${base}:${ticker}` : base;
}

/** Common country / territory names → ISO-3166 alpha-2. */
const COUNTRY_ISO2: Record<string, string> = {
  afghanistan: "af",
  albania: "al",
  algeria: "dz",
  argentina: "ar",
  australia: "au",
  austria: "at",
  belgium: "be",
  brazil: "br",
  bulgaria: "bg",
  canada: "ca",
  chile: "cl",
  china: "cn",
  colombia: "co",
  croatia: "hr",
  "czech republic": "cz",
  czechia: "cz",
  denmark: "dk",
  ecuador: "ec",
  egypt: "eg",
  england: "gb",
  estonia: "ee",
  finland: "fi",
  france: "fr",
  germany: "de",
  greece: "gr",
  hungary: "hu",
  iceland: "is",
  india: "in",
  indonesia: "id",
  iran: "ir",
  ireland: "ie",
  israel: "il",
  italy: "it",
  japan: "jp",
  kazakhstan: "kz",
  kenya: "ke",
  mexico: "mx",
  morocco: "ma",
  netherlands: "nl",
  "new zealand": "nz",
  nigeria: "ng",
  "north korea": "kp",
  norway: "no",
  pakistan: "pk",
  peru: "pe",
  poland: "pl",
  portugal: "pt",
  romania: "ro",
  russia: "ru",
  "saudi arabia": "sa",
  scotland: "gb",
  serbia: "rs",
  singapore: "sg",
  "south africa": "za",
  "south korea": "kr",
  korea: "kr",
  spain: "es",
  sweden: "se",
  switzerland: "ch",
  taiwan: "tw",
  thailand: "th",
  turkey: "tr",
  ukraine: "ua",
  "united arab emirates": "ae",
  uae: "ae",
  "united kingdom": "gb",
  uk: "gb",
  britain: "gb",
  "united states": "us",
  usa: "us",
  america: "us",
  uruguay: "uy",
  venezuela: "ve",
  vietnam: "vn",
  wales: "gb",
};

export function countryIso2FromName(name: string): string | null {
  const lower = name.toLowerCase().trim();
  if (COUNTRY_ISO2[lower]) return COUNTRY_ISO2[lower];

  for (const [country, iso] of Object.entries(COUNTRY_ISO2)) {
    if (lower.includes(country)) return iso;
  }
  return null;
}

export function flagCdnUrl(iso2: string, size = 80): string {
  return `https://flagcdn.com/w${size}/${iso2.toLowerCase()}.png`;
}

/** Crypto symbol aliases → CoinGecko id. */
const CRYPTO_IDS: Record<string, string> = {
  btc: "bitcoin",
  bitcoin: "bitcoin",
  eth: "ethereum",
  ethereum: "ethereum",
  sol: "solana",
  solana: "solana",
  doge: "dogecoin",
  dogecoin: "dogecoin",
  xrp: "ripple",
  ripple: "ripple",
  ada: "cardano",
  cardano: "cardano",
  bnb: "binancecoin",
  usdt: "tether",
  usdc: "usd-coin",
  avax: "avalanche-2",
  link: "chainlink",
  dot: "polkadot",
  matic: "matic-network",
  polygon: "matic-network",
};

export function coinGeckoIdFromName(name: string): string | null {
  const lower = name.toLowerCase().trim();
  if (CRYPTO_IDS[lower]) return CRYPTO_IDS[lower];
  const token = lower.match(/\b([a-z]{2,10})\b/)?.[1];
  if (token && CRYPTO_IDS[token]) return CRYPTO_IDS[token];
  return null;
}
