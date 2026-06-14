import { KALSHI_CDN, seriesIconUrl } from "@/lib/kalshiImages";

const SERIES_OVERRIDES: Record<string, string> = {
  KXNBAGAME: `${KALSHI_CDN}/override_images/sports/Basketball-NBA.webp`,
  KXWNBAGAME: `${KALSHI_CDN}/override_images/sports/Basketball-WNBA.webp`,
  KXNFLGAME: `${KALSHI_CDN}/override_images/sports/Football-NFL.webp`,
  KXMLBGAME: `${KALSHI_CDN}/override_images/sports/Baseball-MLB.webp`,
  KXNHLGAME: `${KALSHI_CDN}/override_images/sports/Hockey-NHL.webp`,
  KXWTAMATCH: `${KALSHI_CDN}/override_images/sports/Tennis-WTA.webp`,
  KXATPMATCH: `${KALSHI_CDN}/override_images/sports/Tennis-ATP.webp`,
  KXUCLGAME: `${KALSHI_CDN}/override_images/sports/Soccer-UEFA.webp`,
  KXEPLGAME: `${KALSHI_CDN}/override_images/sports/Soccer-EPL.webp`,
  KXPRESNOMD: `${KALSHI_CDN}/override_images/core/Democratic.webp`,
  KXPRESNOMR: `${KALSHI_CDN}/override_images/core/Republican.webp`,
};

/** Best-known Kalshi CDN URL for an event series icon. */
export function seriesIconDirectUrl(seriesTicker: string): string | null {
  return SERIES_OVERRIDES[seriesTicker] ?? seriesIconUrl(seriesTicker);
}
