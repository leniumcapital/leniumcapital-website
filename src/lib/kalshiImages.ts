/**
 * Kalshi CDN image URL helpers — shared between server (resolution) and client
 * (rendering). Kalshi uses three asset families:
 *   • series-images-webp/{series}.webp       — event/series icons
 *   • structured_targets/{KEY}.webp          — team flags, logos, tie icons
 *   • market-images/{ticker}.{ext}           — candidate photos, etc.
 */

export const KALSHI_CDN = "https://kalshi.com/cdn-images";

export function seriesIconUrl(seriesTicker: string, size: "sm" | "md" = "sm"): string {
  return `${KALSHI_CDN}/series-images-webp/${encodeURIComponent(seriesTicker)}.webp?size=${size}`;
}

/** Full URL for a structured-target asset key (FLAG_CAN, NBA_NYK, UEFAMEN_TIE, …). */
export function structuredTargetUrl(key: string): string {
  return `${KALSHI_CDN}/structured_targets/${encodeURIComponent(key)}.webp`;
}

/**
 * Ordered market-image candidates for a ticker. Kalshi serves mixed extensions
 * and uses ?size=xs for avatars — try xs variants before full-size.
 */
export function marketImageCandidates(ticker: string): string[] {
  const t = encodeURIComponent(ticker);
  const urls: string[] = [];
  for (const ext of ["webp", "png", "jpg"] as const) {
    urls.push(`${KALSHI_CDN}/market-images/${t}.${ext}?size=xs`);
  }
  for (const ext of ["webp", "png", "jpg"] as const) {
    urls.push(`${KALSHI_CDN}/market-images/${t}.${ext}`);
  }
  return urls;
}

export type StructuredTargetData = {
  type: string;
  name: string;
  details?: {
    abbreviation?: string;
    country?: string;
    country_code?: string;
    league?: string;
    gender?: string;
    short_name?: string;
  };
};

/** ISO-3166 alpha-2 → Kalshi FLAG_ suffix (alpha-3 or Kalshi-specific). */
const FLAG_CODE: Record<string, string> = {
  HR: "HRV",
  GB: "GBR",
  UK: "GBR",
  US: "USA",
  DE: "DEU",
  FR: "FRA",
  ES: "ESP",
  IT: "ITA",
  PT: "PRT",
  NL: "NLD",
  BE: "BEL",
  CH: "CHE",
  AT: "AUT",
  SE: "SWE",
  NO: "NOR",
  DK: "DNK",
  FI: "FIN",
  PL: "POL",
  CZ: "CZE",
  GR: "GRC",
  TR: "TUR",
  RU: "RUS",
  UA: "UKR",
  JP: "JPN",
  CN: "CHN",
  KR: "KOR",
  AU: "AUS",
  NZ: "NZL",
  CA: "CAN",
  MX: "MEX",
  BR: "BRA",
  AR: "ARG",
  CL: "CHL",
  CO: "COL",
  IN: "IND",
  KZ: "KAZ",
};

function normalizeFlagCode(code: string): string {
  const c = code.toUpperCase();
  if (c.length === 3) return c;
  return FLAG_CODE[c] ?? c;
}

/** Pull the UUID from a market's custom_strike object. */
export function structuredTargetId(
  customStrike?: Record<string, string>,
): string | null {
  if (!customStrike) return null;
  for (const v of Object.values(customStrike)) {
    if (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v)) return v;
  }
  return null;
}

/**
 * Map a Kalshi structured-target record to its CDN asset key — the same keys
 * Kalshi's own UI uses (FLAG_CAN, NBA_SAS, UEFAMEN_TIE, …).
 */
export function structuredTargetImageKey(
  target: StructuredTargetData,
  seriesTicker?: string,
): string | null {
  const abbr = target.details?.abbreviation?.toUpperCase();
  const league = target.details?.league?.toUpperCase();
  const isTie =
    abbr === "TIE" ||
    target.name?.toLowerCase() === "tie" ||
    target.details?.short_name?.toLowerCase() === "tie";

  if (isTie) {
    // Kalshi reuses UEFAMEN_TIE for most men's soccer draws (incl. World Cup).
    if (seriesTicker?.includes("MLS")) return "MLS_TIE";
    return "UEFAMEN_TIE";
  }

  switch (target.type) {
    case "basketball_team":
    case "baseball_team":
    case "football_team":
    case "hockey_team":
      if (league && abbr) return `${league}_${abbr}`;
      break;
    case "soccer_team":
      if (abbr) return `FLAG_${abbr}`;
      break;
    case "tennis_competitor": {
      const raw = target.details?.country_code || target.details?.country;
      if (raw) return `FLAG_${normalizeFlagCode(raw)}`;
      break;
    }
  }
  return null;
}
