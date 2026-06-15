import type { ComponentType } from "react";
import {
  IconBallFootball,
  IconBallBasketball,
  IconBallAmericanFootball,
  IconBallBaseball,
  IconBuildingBank,
  IconChartBar,
  IconChartLine,
  IconCloud,
  IconCoin,
  IconFlag,
  IconStar,
  IconWorld,
  IconTrophy,
} from "@tabler/icons-react";
import { seriesIconDirectUrl } from "@/lib/seriesIcon";

const CRYPTO_ICON_URLS: Record<string, string> = {
  bitcoin: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
  btc: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
  ethereum: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
  eth: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
};

export type EventIconKind = "url" | "tabler" | "avatar";

export type EventIconResolution = {
  kind: EventIconKind;
  url?: string;
  Icon?: ComponentType<{ size?: number; stroke?: number; color?: string }>;
  iconColor?: string;
  avatarName?: string;
  avatarCategory?: string;
};

type HardcodedMatch = {
  Icon: ComponentType<{ size?: number; stroke?: number; color?: string }>;
  color?: string;
  cryptoName?: string;
};

function matchHardcoded(displayName: string): HardcodedMatch | null {
  const hay = displayName.toLowerCase();

  if (/fifa|world cup|soccer/.test(hay)) {
    return { Icon: IconBallFootball, color: "#fff" };
  }
  if (/election|presidential|senate|congress|ballot/.test(hay)) {
    return { Icon: IconBuildingBank, color: "#fff" };
  }
  if (/fed|federal reserve|fomc|interest rate|cpi/.test(hay)) {
    return { Icon: IconBuildingBank, color: "#F59E0B" };
  }
  if (/nba|basketball|playoffs/.test(hay)) {
    return { Icon: IconBallBasketball, color: "#fff" };
  }
  if (/nfl|super bowl/.test(hay)) {
    return { Icon: IconBallAmericanFootball, color: "#fff" };
  }
  if (/mlb|world series|baseball/.test(hay)) {
    return { Icon: IconBallBaseball, color: "#fff" };
  }
  if (/champions league|uefa|premier league/.test(hay)) {
    return { Icon: IconTrophy, color: "#fff" };
  }
  if (/bitcoin|btc/.test(hay)) {
    return { Icon: IconCoin, cryptoName: "Bitcoin" };
  }
  if (/ethereum|eth|crypto/.test(hay)) {
    return { Icon: IconCoin, cryptoName: "Ethereum" };
  }
  if (/oscar|grammy|academy/.test(hay)) {
    return { Icon: IconStar, color: "#fff" };
  }
  if (/climate|temperature|hurricane|weather/.test(hay)) {
    return { Icon: IconCloud, color: "#fff" };
  }
  if (/gdp|unemployment|inflation/.test(hay)) {
    return { Icon: IconChartLine, color: "#fff" };
  }

  return null;
}

function categoryIcon(
  category: string,
): { Icon: HardcodedMatch["Icon"]; color: string } {
  const c = category.toLowerCase();
  if (c.includes("sport")) return { Icon: IconTrophy, color: "#fff" };
  if (c.includes("econ")) return { Icon: IconChartBar, color: "#fff" };
  if (c.includes("politic") || c.includes("election")) {
    return { Icon: IconFlag, color: "#fff" };
  }
  if (c.includes("climate") || c.includes("weather")) {
    return { Icon: IconCloud, color: "#fff" };
  }
  if (c.includes("crypto")) return { Icon: IconCoin, color: "#fff" };
  if (c.includes("culture") || c.includes("entertain")) {
    return { Icon: IconStar, color: "#fff" };
  }
  return { Icon: IconWorld, color: "#fff" };
}

function cryptoIconUrl(displayName: string): string | null {
  const hay = displayName.toLowerCase();
  for (const [key, url] of Object.entries(CRYPTO_ICON_URLS)) {
    if (hay.includes(key)) return url;
  }
  return null;
}

/** Resolve icon for a featured event button. */
export function resolveEventIcon(
  seriesTicker: string,
  displayName: string,
  category: string,
  kalshiIconUrl?: string | null,
): EventIconResolution {
  if (kalshiIconUrl?.trim()) {
    return { kind: "url", url: kalshiIconUrl.trim() };
  }

  const seriesUrl = seriesIconDirectUrl(seriesTicker);
  if (seriesUrl) {
    return { kind: "url", url: seriesUrl };
  }

  const hardcoded = matchHardcoded(displayName);
  if (hardcoded) {
    if (hardcoded.cryptoName) {
      const coinUrl = cryptoIconUrl(displayName);
      if (coinUrl) return { kind: "url", url: coinUrl };
      return {
        kind: "avatar",
        avatarName: hardcoded.cryptoName,
        avatarCategory: "Crypto",
      };
    }
    return {
      kind: "tabler",
      Icon: hardcoded.Icon,
      iconColor: hardcoded.color,
    };
  }

  const entityMatch = displayName.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (entityMatch && entityMatch[1].length > 2) {
    return {
      kind: "avatar",
      avatarName: entityMatch[1],
      avatarCategory: category,
    };
  }

  const fallback = categoryIcon(category);
  return { kind: "tabler", Icon: fallback.Icon, iconColor: fallback.color };
}

/** Panel shortcut icons with hardcoded FIFA / US election treatments. */
export function resolvePanelShortcutIcon(
  seriesTicker: string,
  displayName: string,
  category: string,
  kalshiIconUrl?: string | null,
): EventIconResolution {
  const hay = displayName.toLowerCase();

  if (/fifa|world cup|soccer cup/.test(hay)) {
    return { kind: "tabler", Icon: IconBallFootball, iconColor: "#fff" };
  }

  if (/2026.*election|us election|presidential election/.test(hay)) {
    return { kind: "url", url: "https://flagcdn.com/w40/us.png" };
  }

  if (/election|presidential|senate|congress|ballot/.test(hay)) {
    return { kind: "url", url: "https://flagcdn.com/w40/us.png" };
  }

  return resolveEventIcon(seriesTicker, displayName, category, kalshiIconUrl);
}
