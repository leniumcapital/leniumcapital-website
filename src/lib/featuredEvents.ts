/** Curated + dynamic event shortcut cards for the trending sidebar. */

import { seriesIconDirectUrl } from "@/lib/seriesIcon";

export type FeaturedEventShortcut = {
  id: string;
  displayName: string;
  seriesFilter: string;
  /** Match subCategory or series ticker. */
  matchSubCategory?: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  category: string;
  iconUrl?: string | null;
  hardcoded?: boolean;
};

export const HARDCODED_SHORTCUTS: FeaturedEventShortcut[] = [
  {
    id: "world-cup",
    displayName: "World Soccer Cup",
    seriesFilter: "KXWCGAME",
    matchSubCategory: "World Cup",
    gradientFrom: "#0d1a2e",
    gradientTo: "#0a1220",
    borderColor: "#1a3a5c",
    category: "Sports",
    iconUrl: seriesIconDirectUrl("KXWCGAME"),
    hardcoded: true,
  },
  {
    id: "elections-2026",
    displayName: "2026 Elections",
    seriesFilter: "ELECTIONS_2026",
    matchSubCategory: "US Elections",
    gradientFrom: "#1f0d0d",
    gradientTo: "#170a0a",
    borderColor: "#3a1a1a",
    category: "Politics",
    iconUrl: "https://flagcdn.com/w40/us.png",
    hardcoded: true,
  },
];

const EXCLUDED_SERIES = new Set([
  "KXWCGAME",
  "ELECTIONS_2026",
  "KXPRESNOMD",
  "KXPRESNOMR",
]);

function shortcutTheme(
  displayName: string,
  category: string,
): Pick<FeaturedEventShortcut, "gradientFrom" | "gradientTo" | "borderColor"> {
  const name = displayName.toLowerCase();
  const cat = category.toLowerCase();

  if (
    /election|presidential|senate|us election|ballot|congress|primary/.test(name) ||
    cat.includes("politic") ||
    cat.includes("election")
  ) {
    return {
      gradientFrom: "#1f0d0d",
      gradientTo: "#170a0a",
      borderColor: "#3a1a1a",
    };
  }

  if (
    /fifa|world cup|soccer|baseball|basketball|football|hockey|mma|ufc|tennis|sport/.test(
      name,
    ) ||
    cat.includes("sport")
  ) {
    return {
      gradientFrom: "#0d1a2e",
      gradientTo: "#0a1220",
      borderColor: "#1a3a5c",
    };
  }

  if (/fed|fomc|gdp|inflation|cpi|econom/.test(name) || cat.includes("econ")) {
    return {
      gradientFrom: "#111111",
      gradientTo: "#0d0d0d",
      borderColor: "#1C1C1C",
    };
  }

  if (/climate|weather|hurricane/.test(name) || cat.includes("climate")) {
    return {
      gradientFrom: "#0d1f1f",
      gradientTo: "#0a1818",
      borderColor: "#1a3a3a",
    };
  }

  if (/bitcoin|crypto|ethereum/.test(name) || cat.includes("crypto")) {
    return {
      gradientFrom: "#1a1408",
      gradientTo: "#120e06",
      borderColor: "#3a2a10",
    };
  }

  return {
    gradientFrom: "#141414",
    gradientTo: "#0f0f0f",
    borderColor: "#1C1C1C",
  };
}

function inferCategory(displayName: string, seriesTicker: string): string {
  const hay = `${displayName} ${seriesTicker}`.toLowerCase();
  if (/election|president|senate|congress|primary|politic/.test(hay)) {
    return "Politics";
  }
  if (
    /baseball|basketball|football|hockey|soccer|mma|ufc|tennis|sport|mlb|nba|nfl|nhl/.test(
      hay,
    )
  ) {
    return "Sports";
  }
  if (/fed|gdp|inflation|cpi|econom/.test(hay)) return "Economics";
  if (/bitcoin|crypto|ethereum/.test(hay)) return "Crypto";
  if (/climate|weather|hurricane/.test(hay)) return "Climate";
  return "Trending";
}

export function buildDynamicShortcuts(
  sections: {
    seriesTicker: string;
    displayName: string;
    eventTickers: string[];
    category?: string;
  }[],
): FeaturedEventShortcut[] {
  const out: FeaturedEventShortcut[] = [];
  for (const sec of sections) {
    if (sec.eventTickers.length < 2) continue;
    if (EXCLUDED_SERIES.has(sec.seriesTicker)) continue;

    const nameLower = sec.displayName.toLowerCase();
    if (
      nameLower.includes("world cup") ||
      nameLower.includes("2026 election") ||
      nameLower.includes("primaries")
    ) {
      continue;
    }

    if (out.length >= 4) break;

    const category = sec.category ?? inferCategory(sec.displayName, sec.seriesTicker);
    const theme = shortcutTheme(sec.displayName, category);

    out.push({
      id: sec.seriesTicker,
      displayName: sec.displayName,
      seriesFilter: sec.seriesTicker,
      category,
      iconUrl: seriesIconDirectUrl(sec.seriesTicker),
      ...theme,
    });
  }
  return out;
}

export function shortcutMatchesEvent(
  shortcut: FeaturedEventShortcut,
  seriesTicker: string,
  subCategory?: string,
  category?: string,
): boolean {
  if (shortcut.seriesFilter === seriesTicker) return true;
  if (shortcut.matchSubCategory && subCategory === shortcut.matchSubCategory) {
    return true;
  }
  if (shortcut.id === "elections-2026") {
    return (
      category === "Elections" ||
      category === "Politics" ||
      /primary|primaries|governor|nominee|senate|president/i.test(
        `${subCategory ?? ""}`,
      )
    );
  }
  if (shortcut.id === "world-cup") {
    return (
      /world cup|soccer cup/i.test(subCategory ?? "") ||
      seriesTicker.includes("WC") ||
      seriesTicker === "KXWCGAME"
    );
  }
  return false;
}
