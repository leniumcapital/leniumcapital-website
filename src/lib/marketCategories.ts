/**
 * Top-level market categories and subcategory detection for the dashboard
 * two-tier navigation (Kalshi-style).
 */

export type SeriesInfo = { title: string; tags: string[] };

/** Top horizontal bar — order matches Kalshi. */
export const PRIMARY_TABS = [
  "Trending",
  "Elections",
  "Politics",
  "Sports",
  "Culture",
  "Crypto",
  "Commodities",
  "Climate",
  "Economics",
  "Mentions",
  "Finance",
  "Tech and Science",
] as const;

export type PrimaryTab = (typeof PRIMARY_TABS)[number];

/** Primary categories that never show a subcategory sidebar. */
export const TABS_WITHOUT_SIDEBAR = new Set<string>(["Trending"]);

/** Kalshi /series?category= param for directory lookups. */
export const KALSHI_SERIES_CATEGORY: Partial<Record<string, string>> = {
  Elections: "Elections",
  Politics: "Politics",
  Sports: "Sports",
  Culture: "Entertainment",
  Crypto: "Crypto",
  Commodities: "Financials",
  Climate: "Climate and Weather",
  Economics: "Economics",
  Finance: "Financials",
  "Tech and Science": "Science and Technology",
};

/** Preferred subcategory display order when present in live data. */
export const SUBCATEGORY_ORDER: Record<string, string[]> = {
  Economics: [
    "Econ Daily",
    "Fed",
    "GDP",
    "Global Central Banks",
    "Growth",
    "Housing",
    "Inflation",
    "Jobs & Economy",
    "Oil and Energy",
  ],
  Politics: [
    "White House",
    "Congress",
    "Courts",
    "US Elections",
    "Global Politics",
    "Policy",
  ],
  Elections: ["President", "Senate", "House", "Governor", "Primary", "Ballot"],
  Sports: [
    "World Cup",
    "Soccer",
    "Basketball",
    "Football",
    "Baseball",
    "Hockey",
    "Tennis",
    "Golf",
    "MMA",
    "Boxing",
    "Motorsports",
    "Cricket",
    "Esports",
    "Olympics",
    "More Sports",
  ],
  Finance: ["Stocks", "Rates", "Forex", "IPOs", "Earnings", "Indices"],
  Commodities: ["Oil and Energy", "Metals", "Agriculture", "Gas"],
  Crypto: ["Bitcoin", "Ethereum", "Altcoins", "Regulation"],
  Culture: ["Music", "Film", "TV", "Awards", "Celebrity"],
  Climate: ["Weather", "Temperature", "Storms", "Emissions"],
  "Tech and Science": ["AI", "Space", "Science", "Big Tech", "Products"],
  Mentions: ["Social", "Media", "Trending Mentions"],
};

type SubRule = { name: string; pattern: RegExp };

const ECONOMICS_RULES: SubRule[] = [
  { name: "Econ Daily", pattern: /econ daily|daily econ|market wrap/i },
  { name: "Fed", pattern: /\bfed\b|fomc|federal reserve|interest rate|rate cut|rate hike|powell/i },
  { name: "GDP", pattern: /\bgdp\b|gross domestic/i },
  { name: "Global Central Banks", pattern: /ecb|boj|bank of england|central bank|boe rate/i },
  { name: "Growth", pattern: /economic growth|recession|expansion/i },
  { name: "Housing", pattern: /housing|home price|mortgage|rent/i },
  { name: "Inflation", pattern: /inflation|cpi|ppi|pce|prices/i },
  { name: "Jobs & Economy", pattern: /jobs|unemployment|nonfarm|payroll|labor/i },
  { name: "Oil and Energy", pattern: /oil|crude|gas price|energy|opec|wti|brent/i },
];

const POLITICS_RULES: SubRule[] = [
  { name: "US Elections", pattern: /election|ballot|primary|nominee|vote/i },
  { name: "White House", pattern: /white house|president|biden|trump|approval/i },
  { name: "Congress", pattern: /congress|senate|house of rep|speaker|legislat/i },
  { name: "Courts", pattern: /supreme court|scotus|court ruling/i },
  { name: "Global Politics", pattern: /ukraine|israel|china|nato|war|tariff|trade deal/i },
  { name: "Policy", pattern: /policy|regulation|executive order|bill/i },
];

const ELECTIONS_RULES: SubRule[] = [
  { name: "President", pattern: /president|presidential|white house/i },
  { name: "Senate", pattern: /senate/i },
  { name: "House", pattern: /house of rep|house seat/i },
  { name: "Governor", pattern: /governor|gubernatorial/i },
  { name: "Primary", pattern: /primary|caucus/i },
  { name: "Ballot", pattern: /ballot|referendum|proposition/i },
];

const FINANCE_RULES: SubRule[] = [
  { name: "Indices", pattern: /s&p|nasdaq|dow|index/i },
  { name: "Stocks", pattern: /stock|share|equity|aapl|nvda|tesla/i },
  { name: "Rates", pattern: /treasury|yield|bond/i },
  { name: "IPOs", pattern: /ipo/i },
  { name: "Earnings", pattern: /earnings|revenue/i },
  { name: "Forex", pattern: /forex|usd\/|eur\/|currency/i },
];

const COMMODITIES_RULES: SubRule[] = [
  { name: "Oil and Energy", pattern: /oil|crude|gas|energy|wti|brent/i },
  { name: "Metals", pattern: /gold|silver|copper|metal/i },
  { name: "Agriculture", pattern: /corn|wheat|soy|agriculture|crop/i },
  { name: "Gas", pattern: /natural gas|henry hub/i },
];

const CRYPTO_RULES: SubRule[] = [
  { name: "Bitcoin", pattern: /bitcoin|\bbtc\b/i },
  { name: "Ethereum", pattern: /ethereum|\beth\b/i },
  { name: "Altcoins", pattern: /solana|doge|xrp|altcoin/i },
  { name: "Regulation", pattern: /crypto regulation|sec.*crypto/i },
];

const CULTURE_RULES: SubRule[] = [
  { name: "Film", pattern: /movie|film|box office|oscar/i },
  { name: "Music", pattern: /music|album|grammy|spotify/i },
  { name: "TV", pattern: /tv|television|netflix|streaming/i },
  { name: "Awards", pattern: /award|emmy|golden globe/i },
  { name: "Celebrity", pattern: /celebrity|kardashian|taylor swift/i },
];

const CLIMATE_RULES: SubRule[] = [
  { name: "Weather", pattern: /weather|temperature|rain|snow/i },
  { name: "Storms", pattern: /hurricane|storm|tornado|flood/i },
  { name: "Emissions", pattern: /emission|carbon|climate change/i },
];

const TECH_RULES: SubRule[] = [
  { name: "AI", pattern: /\bai\b|artificial intelligence|openai|chatgpt|llm/i },
  { name: "Space", pattern: /space|nasa|spacex|rocket|moon/i },
  { name: "Science", pattern: /science|research|nobel/i },
  { name: "Big Tech", pattern: /apple|google|meta|microsoft|amazon/i },
  { name: "Products", pattern: /iphone|launch|product/i },
];

const MENTIONS_RULES: SubRule[] = [
  { name: "Social", pattern: /twitter|x\.com|social media|tiktok/i },
  { name: "Media", pattern: /media|news|headline/i },
  { name: "Trending Mentions", pattern: /mention|said|tweet/i },
];

const CATEGORY_RULES: Record<string, SubRule[]> = {
  Economics: ECONOMICS_RULES,
  Politics: POLITICS_RULES,
  Elections: ELECTIONS_RULES,
  Finance: FINANCE_RULES,
  Commodities: COMMODITIES_RULES,
  Crypto: CRYPTO_RULES,
  Culture: CULTURE_RULES,
  Climate: CLIMATE_RULES,
  "Tech and Science": TECH_RULES,
  Mentions: MENTIONS_RULES,
};

/** Normalize raw Kalshi category strings into dashboard primary tabs. */
export function normalizePrimaryCategory(raw: string | undefined): string {
  const c = (raw ?? "").toLowerCase();
  if (c.includes("election")) return "Elections";
  if (c.includes("sport") || c.includes("baseball") || c.includes("football") || c.includes("basketball") || c.includes("soccer") || c.includes("hockey"))
    return "Sports";
  if (c.includes("crypto")) return "Crypto";
  if (c.includes("commod")) return "Commodities";
  if (c.includes("financ") || c.includes("stock") || c.includes("equity")) return "Finance";
  if (c.includes("econ") || c.includes("inflation") || c.includes("gdp") || c.includes("jobs"))
    return "Economics";
  if (c.includes("politic") || c.includes("world") || c.includes("gov")) return "Politics";
  if (c.includes("entertain") || c.includes("culture") || c.includes("media") || c.includes("music") || c.includes("movie"))
    return "Culture";
  if (c.includes("climate") || c.includes("weather")) return "Climate";
  if (c.includes("tech") || c.includes("science") || c.includes("ai") || c.includes("space"))
    return "Tech and Science";
  if (c.includes("health")) return "Tech and Science";
  if (c.includes("mention")) return "Mentions";
  return "Culture";
}

function matchRules(text: string, rules: SubRule[]): string | undefined {
  for (const rule of rules) {
    if (rule.pattern.test(text)) return rule.name;
  }
  return undefined;
}

/** Sports subcategory — reuses series tags + title patterns. */
export function detectSportsSubCategory(
  seriesTicker: string | undefined,
  title: string | undefined,
  series?: SeriesInfo,
): string {
  const text = `${series?.title ?? ""} ${title ?? ""}`;
  if (/world ?cup|fifa/i.test(text) && !/club world/i.test(text)) {
    const tag = series?.tags?.[0];
    if (!tag || tag === "Soccer") return "World Cup";
  }
  const TAG_TO_SPORT: Record<string, string> = {
    Soccer: "Soccer",
    Basketball: "Basketball",
    Football: "Football",
    CFB: "Football",
    Baseball: "Baseball",
    Hockey: "Hockey",
    Tennis: "Tennis",
    Golf: "Golf",
    MMA: "MMA",
    UFC: "MMA",
    Boxing: "Boxing",
    Motorsport: "Motorsports",
    Cricket: "Cricket",
    Esports: "Esports",
    "Video games": "Esports",
    Olympics: "Olympics",
  };
  for (const tag of series?.tags ?? []) {
    const sport = TAG_TO_SPORT[tag];
    if (sport) return sport;
  }
  const SPORT_RULES = [
    { name: "World Cup", pattern: /world ?cup|fifa/i },
    { name: "Soccer", pattern: /soccer|premier league|champions league|mls|uefa/i },
    { name: "Basketball", pattern: /nba|wnba|basketball/i },
    { name: "Football", pattern: /nfl|college football|super bowl/i },
    { name: "Baseball", pattern: /mlb|baseball|world series/i },
    { name: "Hockey", pattern: /nhl|hockey|stanley cup/i },
    { name: "Tennis", pattern: /tennis|wimbledon|atp|wta/i },
    { name: "Golf", pattern: /golf|pga|masters/i },
    { name: "MMA", pattern: /ufc|mma/i },
    { name: "Boxing", pattern: /boxing/i },
    { name: "Motorsports", pattern: /formula ?1|\bf1\b|nascar/i },
    { name: "Cricket", pattern: /cricket|\bipl\b/i },
    { name: "Esports", pattern: /esports|valorant|league of legends/i },
    { name: "Olympics", pattern: /olympic/i },
  ];
  const fallbackText = `${seriesTicker ?? ""} ${text}`;
  for (const rule of SPORT_RULES) {
    if (rule.pattern.test(fallbackText)) return rule.name;
  }
  return "More Sports";
}

/**
 * Detect subcategory for any primary category. Uses series tags first,
 * then keyword rules on series ticker + title.
 */
export function detectSubCategory(
  primaryCategory: string,
  seriesTicker: string | undefined,
  title: string | undefined,
  series?: SeriesInfo,
): string | undefined {
  if (primaryCategory === "Sports") {
    return detectSportsSubCategory(seriesTicker, title, series);
  }

  const rules = CATEGORY_RULES[primaryCategory];
  if (!rules) return undefined;

  for (const tag of series?.tags ?? []) {
    const hit = matchRules(tag, rules);
    if (hit) return hit;
  }

  const text = `${seriesTicker ?? ""} ${series?.title ?? ""} ${title ?? ""}`;
  return matchRules(text, rules);
}

/** Sort subcategories: preferred order first, then alphabetical extras. */
export function sortSubcategories(primaryCategory: string, found: string[]): string[] {
  const preferred = SUBCATEGORY_ORDER[primaryCategory] ?? [];
  const ordered = preferred.filter((s) => found.includes(s));
  const extras = found.filter((s) => !preferred.includes(s)).sort();
  return [...ordered, ...extras];
}
