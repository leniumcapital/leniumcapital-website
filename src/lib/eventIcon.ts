import type { ComponentType } from "react";
import {
  IconBallFootball,
  IconBallBasketball,
  IconBallAmericanFootball,
  IconBallBaseball,
  IconBuildingBank,
  IconBuildingMonument,
  IconChartBar,
  IconCloud,
  IconCoin,
  IconBallFootball as IconSoccer,
  IconMovie,
  IconStar,
  IconWorld,
  IconTrophy,
} from "@tabler/icons-react";
import { seriesIconDirectUrl } from "@/lib/seriesIcon";

export type EventIconKind =
  | "url"
  | "tabler"
  | "avatar";

export type EventIconResolution = {
  kind: EventIconKind;
  url?: string;
  Icon?: ComponentType<{ size?: number; stroke?: number; color?: string }>;
  avatarName?: string;
  avatarCategory?: string;
};

function matchHardcoded(
  seriesTicker: string,
  displayName: string,
): ComponentType<{ size?: number; stroke?: number; color?: string }> | null {
  const hay = `${seriesTicker} ${displayName}`.toLowerCase();

  if (/fifa|world.?cup|soccer|football(?!.*american)/i.test(hay)) return IconSoccer;
  if (/champions.?league|uefa/i.test(hay)) return IconTrophy;
  if (/election|presidential|senate|congress/i.test(hay)) return IconBuildingMonument;
  if (/fed|fomc|federal.?reserve|interest.?rate/i.test(hay)) return IconBuildingBank;
  if (/nba|basketball/i.test(hay)) return IconBallBasketball;
  if (/nfl|super.?bowl/i.test(hay)) return IconBallAmericanFootball;
  if (/mlb|world.?series|baseball/i.test(hay)) return IconBallBaseball;
  if (/bitcoin|btc/i.test(hay)) return IconCoin;
  if (/ethereum|eth|crypto/i.test(hay)) return IconCoin;
  if (/oscar|grammy|academy/i.test(hay)) return IconMovie;
  if (/climate|temperature|hurricane|weather/i.test(hay)) return IconCloud;
  if (/gdp|unemployment|cpi|inflation|economics/i.test(hay)) return IconChartBar;

  return null;
}

function categoryIcon(
  category: string,
): ComponentType<{ size?: number; stroke?: number; color?: string }> {
  const c = category.toLowerCase();
  if (c.includes("sport")) return IconBallFootball;
  if (c.includes("econ") || c.includes("financ")) return IconChartBar;
  if (c.includes("politic") || c.includes("election")) return IconBuildingMonument;
  if (c.includes("climate") || c.includes("weather")) return IconCloud;
  if (c.includes("crypto")) return IconCoin;
  if (c.includes("culture") || c.includes("entertain")) return IconStar;
  return IconWorld;
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

  const hardcoded = matchHardcoded(seriesTicker, displayName);
  if (hardcoded) {
    return { kind: "tabler", Icon: hardcoded };
  }

  const entityMatch = displayName.match(
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
  );
  if (entityMatch && entityMatch[1].length > 2) {
    return {
      kind: "avatar",
      avatarName: entityMatch[1],
      avatarCategory: category,
    };
  }

  return { kind: "tabler", Icon: categoryIcon(category) };
}
