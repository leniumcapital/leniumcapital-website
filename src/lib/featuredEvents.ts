/** Curated + dynamic event shortcut cards for the trending sidebar. */

export type FeaturedEventShortcut = {
  id: string;
  displayName: string;
  seriesFilter: string;
  /** Match subCategory or series ticker. */
  matchSubCategory?: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  iconType: "soccer" | "flag-us" | "category";
  category?: string;
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
    iconType: "soccer",
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
    iconType: "flag-us",
    hardcoded: true,
  },
];

const EXCLUDED_DYNAMIC = new Set(["world-cup", "elections-2026", "world cup", "2026 elections"]);

export function buildDynamicShortcuts(
  sections: { seriesTicker: string; displayName: string; eventTickers: string[] }[],
): FeaturedEventShortcut[] {
  const out: FeaturedEventShortcut[] = [];
  for (const sec of sections) {
    if (sec.eventTickers.length < 2) continue;
    const nameLower = sec.displayName.toLowerCase();
    if (
      EXCLUDED_DYNAMIC.has(nameLower) ||
      nameLower.includes("world cup") ||
      nameLower.includes("2026 election")
    ) {
      continue;
    }
    if (out.length >= 4) break;
    out.push({
      id: sec.seriesTicker,
      displayName: sec.displayName,
      seriesFilter: sec.seriesTicker,
      gradientFrom: "#141414",
      gradientTo: "#0f0f0f",
      borderColor: "#1C1C1C",
      iconType: "category",
      category: sec.displayName,
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
      seriesTicker.includes("WC")
    );
  }
  return false;
}
