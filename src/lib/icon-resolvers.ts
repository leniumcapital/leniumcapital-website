import "server-only";

import { prisma } from "@/lib/db";
import { normalizeNameKey } from "@/lib/icon-keys";
import { marketImageCandidates } from "@/lib/kalshiImages";

const FETCH_TIMEOUT_MS = 5000;

const FLAG_COUNTRY_CODES: Record<string, string> = {
  "united states": "us",
  "united kingdom": "gb",
  france: "fr",
  germany: "de",
  spain: "es",
  italy: "it",
  japan: "jp",
  china: "cn",
  russia: "ru",
  brazil: "br",
  canada: "ca",
  australia: "au",
  india: "in",
  mexico: "mx",
  "south korea": "kr",
  netherlands: "nl",
  belgium: "be",
  sweden: "se",
  norway: "no",
  denmark: "dk",
  finland: "fi",
  switzerland: "ch",
  austria: "at",
  portugal: "pt",
  greece: "gr",
  turkey: "tr",
  poland: "pl",
  ukraine: "ua",
  israel: "il",
  "saudi arabia": "sa",
  "united arab emirates": "ae",
  "south africa": "za",
  nigeria: "ng",
  egypt: "eg",
  argentina: "ar",
  chile: "cl",
  colombia: "co",
  venezuela: "ve",
  "new zealand": "nz",
  ireland: "ie",
  scotland: "gb-sct",
  wales: "gb-wls",
  "north macedonia": "mk",
  "bosnia and herzegovina": "ba",
  serbia: "rs",
};

const CLEARBIT_DOMAINS: Record<string, string> = {
  apple: "apple.com",
  microsoft: "microsoft.com",
  google: "google.com",
  alphabet: "abc.xyz",
  amazon: "amazon.com",
  meta: "meta.com",
  tesla: "tesla.com",
  nvidia: "nvidia.com",
  netflix: "netflix.com",
  spotify: "spotify.com",
  twitter: "twitter.com",
  x: "x.com",
  openai: "openai.com",
  anthropic: "anthropic.com",
  coinbase: "coinbase.com",
  robinhood: "robinhood.com",
  jpmorgan: "jpmorganchase.com",
  "goldman sachs": "goldmansachs.com",
  "federal reserve": "federalreserve.gov",
};

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let res = await fetch(url, { ...init, signal: controller.signal });
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? 2) * 1000 || 2000;
      await new Promise((r) => setTimeout(r, retryAfter));
      res = await fetch(url, { ...init, signal: controller.signal });
    }
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function leagueMatchesResult(
  league: string | undefined,
  name: string,
  category: string,
): boolean {
  if (category !== "Sports") return true;
  const n = name.toLowerCase();
  const l = (league ?? "").toLowerCase();
  if (n.includes("nba") || l.includes("nba") || l.includes("basketball")) {
    return l.includes("nba") || l.includes("basketball");
  }
  if (n.includes("nfl") || l.includes("nfl") || l.includes("football")) {
    return l.includes("nfl") || l.includes("american football");
  }
  if (n.includes("mlb") || l.includes("mlb") || l.includes("baseball")) {
    return l.includes("mlb") || l.includes("baseball");
  }
  if (n.includes("nhl") || l.includes("nhl") || l.includes("hockey")) {
    return l.includes("nhl") || l.includes("hockey");
  }
  if (l.includes("premier league") || l.includes("english league")) {
    return l.includes("premier") || l.includes("english");
  }
  return true;
}

export async function resolveFromWikipedia(name: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      action: "query",
      titles: name,
      prop: "pageimages",
      format: "json",
      pithumbsize: "200",
      redirects: "1",
    });
    const res = await fetchWithTimeout(
      `https://en.wikipedia.org/w/api.php?${params}`,
      { headers: { "User-Agent": "LeniumCapital/1.0" } },
    );
    if (!res?.ok) return null;
    const data = (await res.json()) as {
      query?: { pages?: Record<string, { thumbnail?: { source?: string } }> };
    };
    const pages = data.query?.pages;
    if (!pages) return null;
    for (const key of Object.keys(pages)) {
      const thumb = pages[key]?.thumbnail?.source;
      if (thumb) return thumb;
    }
    return null;
  } catch {
    return null;
  }
}

export async function resolveFromTheSportsDB(
  name: string,
  category = "Sports",
): Promise<string | null> {
  try {
    const teamParams = new URLSearchParams({ t: name });
    const teamRes = await fetchWithTimeout(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?${teamParams}`,
    );
    if (teamRes?.ok) {
      const data = (await teamRes.json()) as {
        teams?: { strTeamBadge?: string; strLeague?: string }[];
      };
      const teams = data.teams ?? [];
      for (const team of teams) {
        if (!leagueMatchesResult(team.strLeague, name, category)) continue;
        if (team.strTeamBadge) return team.strTeamBadge;
      }
      if (teams[0]?.strTeamBadge && category !== "Sports") {
        return teams[0].strTeamBadge;
      }
    }

    const playerParams = new URLSearchParams({ p: name });
    const playerRes = await fetchWithTimeout(
      `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?${playerParams}`,
    );
    if (!playerRes?.ok) return null;
    const pdata = (await playerRes.json()) as {
      player?: { strCutout?: string; strThumb?: string }[];
    };
    const players = pdata.player ?? [];
    if (players.length === 0) return null;
    return players[0].strCutout ?? players[0].strThumb ?? null;
  } catch {
    return null;
  }
}

export async function resolveFromCoinGecko(name: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ q: name });
    const res = await fetchWithTimeout(
      `https://api.coingecko.com/api/v3/search?${params}`,
    );
    if (!res?.ok) return null;
    const data = (await res.json()) as {
      coins?: { thumb?: string; large?: string }[];
    };
    const coins = data.coins;
    if (!coins?.length) return null;
    return coins[0].large ?? coins[0].thumb ?? null;
  } catch {
    return null;
  }
}

export function resolveFromFlagCDN(countryName: string): string | null {
  try {
    const lower = countryName.toLowerCase().trim();
    const code = FLAG_COUNTRY_CODES[lower];
    if (!code) return null;
    return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
  } catch {
    return null;
  }
}

export function resolveFromClearbit(companyName: string): string | null {
  try {
    const lower = companyName.toLowerCase().trim();
    const domain = CLEARBIT_DOMAINS[lower];
    if (domain) return `https://logo.clearbit.com/${domain}`;
    const constructed = lower.replace(/[^a-z0-9]/g, "") + ".com";
    if (constructed.length > 4) {
      return `https://logo.clearbit.com/${constructed}`;
    }
    return null;
  } catch {
    return null;
  }
}

export async function resolveFromTMDB(name: string): Promise<string | null> {
  try {
    const apiKey = process.env.TMDB_API_KEY?.trim();
    if (!apiKey) return null;
    const params = new URLSearchParams({
      api_key: apiKey,
      query: name,
    });
    const res = await fetchWithTimeout(
      `https://api.themoviedb.org/3/search/multi?${params}`,
    );
    if (!res?.ok) return null;
    const data = (await res.json()) as {
      results?: { profile_path?: string | null; poster_path?: string | null }[];
    };
    const first = data.results?.[0];
    if (!first) return null;
    const path = first.profile_path ?? first.poster_path;
    if (!path) return null;
    return `https://image.tmdb.org/t/p/w200${path}`;
  } catch {
    return null;
  }
}

const STATIC_CRYPTO: Record<string, string> = {
  btc: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  bitcoin: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  eth: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  ethereum: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  sol: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  solana: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
};

function resolveCryptoFromContext(...parts: (string | undefined)[]): string | null {
  const blob = parts.filter(Boolean).join(" ").toLowerCase();
  if (/\bbtc\b|bitcoin|kxbtc/.test(blob)) return STATIC_CRYPTO.btc;
  if (/\beth\b|ethereum|kxeth/.test(blob)) return STATIC_CRYPTO.eth;
  if (/\bsol\b|solana|kxsol/.test(blob)) return STATIC_CRYPTO.sol;
  return null;
}

async function resolveByCategory(
  name: string,
  category: string,
  seriesTicker?: string,
  eventTitle?: string,
): Promise<{ url: string; source: string } | null> {
  const cat = category.trim();
  const context = [eventTitle, seriesTicker, name].filter(Boolean).join(" ");

  if (cat === "Elections" || cat === "Politics") {
    const wiki = await resolveFromWikipedia(name);
    if (wiki) return { url: wiki, source: "wikipedia" };
    const flag = resolveFromFlagCDN(name);
    if (flag) return { url: flag, source: "flagcdn" };
    return null;
  }

  if (cat === "Sports") {
    const sports = await resolveFromTheSportsDB(name, cat);
    if (sports) return { url: sports, source: "sportsdb" };
    return null;
  }

  if (cat === "Crypto") {
    const staticCoin = resolveCryptoFromContext(context);
    if (staticCoin) return { url: staticCoin, source: "coingecko_static" };
    const coin = await resolveFromCoinGecko(context || name);
    if (coin) return { url: coin, source: "coingecko" };
    return null;
  }

  if (cat === "Economics" || cat === "Finance") {
    const logo = resolveFromClearbit(context || name);
    if (logo) return { url: logo, source: "clearbit" };
    const wiki = await resolveFromWikipedia(name);
    if (wiki) return { url: wiki, source: "wikipedia" };
    return null;
  }

  if (cat === "Culture") {
    const logo = resolveFromClearbit(context || name);
    if (logo) return { url: logo, source: "clearbit" };
    const tmdb = await resolveFromTMDB(name);
    if (tmdb) return { url: tmdb, source: "tmdb" };
    const wiki = await resolveFromWikipedia(name);
    if (wiki) return { url: wiki, source: "wikipedia" };
    return null;
  }

  if (cat === "Climate") {
    const flag = resolveFromFlagCDN(name);
    if (flag) return { url: flag, source: "flagcdn" };
    const wiki = await resolveFromWikipedia(name);
    if (wiki) return { url: wiki, source: "wikipedia" };
    return null;
  }

  const wiki = await resolveFromWikipedia(name);
  if (wiki) return { url: wiki, source: "wikipedia" };
  const flag = resolveFromFlagCDN(name);
  if (flag) return { url: flag, source: "flagcdn" };
  return null;
}

function cacheIconAsync(
  nameKey: string,
  displayName: string,
  category: string,
  imageUrl: string,
  source: string,
): void {
  void prisma.iconMapping
    .upsert({
      where: { nameKey_category: { nameKey, category } },
      create: {
        nameKey,
        displayName,
        imageUrl,
        category,
        source,
        isVerified: false,
      },
      update: {
        displayName,
        imageUrl,
        source,
        isInvalidated: false,
        failCount: 0,
      },
    })
    .catch(() => {});
}

async function findFirstWorkingMarketImage(ticker: string): Promise<string | null> {
  for (const url of marketImageCandidates(ticker)) {
    const res = await fetchWithTimeout(url, { method: "HEAD" });
    if (res?.ok) return url;
  }
  return null;
}

export async function resolveIconForOutcome(
  name: string,
  category: string,
  kalshiImageUrl?: string | null,
  marketTicker?: string | null,
  seriesTicker?: string | null,
  eventTitle?: string | null,
): Promise<string | null> {
  if (kalshiImageUrl && kalshiImageUrl.trim()) {
    return kalshiImageUrl.trim();
  }

  const nameKey = normalizeNameKey(name);
  const cat = category.trim() || "Other";
  if (!nameKey && !marketTicker) return null;

  try {
    if (nameKey) {
      const cached = await prisma.iconMapping.findUnique({
        where: { nameKey_category: { nameKey, category: cat } },
      });
      if (cached && !cached.isInvalidated) {
        return cached.imageUrl;
      }
    }

    if (marketTicker?.trim()) {
      const marketUrl = await findFirstWorkingMarketImage(marketTicker.trim());
      if (marketUrl && nameKey) {
        cacheIconAsync(nameKey, name.trim(), cat, marketUrl, "kalshi_market");
        return marketUrl;
      }
      if (marketUrl) return marketUrl;
    }

    if (!nameKey && !eventTitle && !seriesTicker) return null;

    const resolved = await resolveByCategory(
      name,
      cat,
      seriesTicker ?? undefined,
      eventTitle ?? undefined,
    );
    if (!resolved) return null;

    if (nameKey) {
      cacheIconAsync(nameKey, name.trim(), cat, resolved.url, resolved.source);
    }
    return resolved.url;
  } catch {
    return null;
  }
}

export async function cacheKalshiIcon(
  name: string,
  category: string,
  imageUrl: string,
): Promise<void> {
  const nameKey = normalizeNameKey(name);
  const cat = category.trim() || "Other";
  if (!nameKey || !imageUrl) return;
  try {
    await prisma.iconMapping.upsert({
      where: { nameKey_category: { nameKey, category: cat } },
      create: {
        nameKey,
        displayName: name.trim(),
        imageUrl,
        category: cat,
        source: "kalshi",
        isVerified: false,
      },
      update: {
        imageUrl,
        source: "kalshi",
        isInvalidated: false,
        failCount: 0,
      },
    });
  } catch {
    /* best-effort */
  }
}

export type PrefetchOutcome = { name: string; category: string; ticker?: string | null };

export type IconPrefetchOutcome = {
  name: string;
  category: string;
  imageUrl?: string | null;
  ticker?: string | null;
};

/** Fire-and-forget icon cache warm-up from dashboard events. */
export function backgroundIconPrefetchFromEvents(
  events: {
    category: string;
    outcomes: { name: string; imageUrl?: string; ticker?: string }[];
  }[],
): void {
  void queueIconPrefetchFromEvents(events);
}

/** Collect outcomes needing resolution and warm the cache without blocking. */
export async function queueIconPrefetchFromEvents(
  events: {
    category: string;
    outcomes: { name: string; imageUrl?: string; ticker?: string }[];
  }[],
): Promise<number> {
  const seen = new Set<string>();
  const toPrefetch: PrefetchOutcome[] = [];

  for (const ev of events) {
    const category = ev.category.trim() || "Other";
    for (const o of ev.outcomes) {
      const name = o.name?.trim();
      if (!name) continue;
      const key = `${normalizeNameKey(name)}::${category}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (o.imageUrl?.trim()) {
        void cacheKalshiIcon(name, category, o.imageUrl.trim());
      } else {
        const nameKey = normalizeNameKey(name);
        if (!nameKey) continue;
        try {
          const existing = await prisma.iconMapping.findUnique({
            where: { nameKey_category: { nameKey, category } },
          });
          if (!existing || existing.isInvalidated) {
            toPrefetch.push({ name, category, ticker: o.ticker ?? null });
          }
        } catch {
          toPrefetch.push({ name, category, ticker: o.ticker ?? null });
        }
      }
    }
  }

  if (toPrefetch.length === 0) return 0;
  void prefetchOutcomesBatch(toPrefetch, 5);
  return toPrefetch.length;
}

export async function prefetchOutcomesBatch(
  outcomes: PrefetchOutcome[],
  concurrency = 5,
): Promise<number> {
  let queued = 0;
  for (let i = 0; i < outcomes.length; i += concurrency) {
    const batch = outcomes.slice(i, i + concurrency);
    await Promise.allSettled(
      batch.map(async (o) => {
        const nameKey = normalizeNameKey(o.name);
        const cat = o.category.trim() || "Other";
        if (!nameKey) return;
        const existing = await prisma.iconMapping.findUnique({
          where: { nameKey_category: { nameKey, category: cat } },
        });
        if (existing && !existing.isInvalidated) return;
        queued++;
        await resolveIconForOutcome(o.name, cat, null, o.ticker ?? null);
      }),
    );
  }
  return queued;
}
