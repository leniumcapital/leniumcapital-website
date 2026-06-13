/**
 * Server-side option image resolution with in-memory caching.
 * Priority: provided URL (validated) → category API lookup → null (client initials).
 */
import "server-only";

import {
  coinGeckoIdFromName,
  countryIso2FromName,
  flagCdnUrl,
  imageResolveStrategy,
  optionImageCacheKey,
  type ImageResolveStrategy,
} from "@/lib/optionImage";

const UA = "LeniumCapital/1.0 (https://lenium.capital; dashboard-images)";

type ResolveInput = {
  name: string;
  category: string;
  ticker?: string;
};

const cache = new Map<string, string | null>();
const CACHE_MAX = 5000;

async function fetchJson<T>(url: string, ms = 5000): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": UA },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function urlExists(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: ctrl.signal,
      headers: { "User-Agent": UA },
    });
    if (res.ok) return true;
    if (res.status === 405 || res.status === 403) {
      const get = await fetch(url, {
        method: "GET",
        signal: ctrl.signal,
        headers: { "User-Agent": UA },
      });
      return get.ok;
    }
    return false;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveSports(name: string): Promise<string | null> {
  const teamData = await fetchJson<{
    teams?: { strTeamBadge?: string; strBadge?: string }[];
  }>(
    `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(name)}`,
  );
  const badge =
    teamData?.teams?.[0]?.strTeamBadge ?? teamData?.teams?.[0]?.strBadge;
  if (badge && (await urlExists(badge))) return badge;

  const playerData = await fetchJson<{
    player?: { strThumb?: string; strCutout?: string }[];
  }>(
    `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name)}`,
  );
  const thumb =
    playerData?.player?.[0]?.strCutout ?? playerData?.player?.[0]?.strThumb;
  if (thumb && (await urlExists(thumb))) return thumb;

  return resolveWikipedia(name);
}

async function resolveWikipedia(name: string): Promise<string | null> {
  const data = await fetchJson<{
    thumbnail?: { source?: string };
    originalimage?: { source?: string };
  }>(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, "_"))}`,
  );
  const url = data?.thumbnail?.source ?? data?.originalimage?.source;
  if (url && (await urlExists(url))) return url;
  return null;
}

async function resolvePolitics(name: string): Promise<string | null> {
  return resolveWikipedia(name);
}

async function resolveCrypto(name: string): Promise<string | null> {
  const id = coinGeckoIdFromName(name);
  if (id) {
    const data = await fetchJson<{ image?: { small?: string; large?: string } }>(
      `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`,
    );
    const url = data?.image?.large ?? data?.image?.small;
    if (url && (await urlExists(url))) return url;
  }

  const search = await fetchJson<{
    coins?: { thumb?: string; large?: string }[];
  }>(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(name)}`,
  );
  const hit = search?.coins?.[0];
  const url = hit?.large ?? hit?.thumb;
  if (url && (await urlExists(url))) return url;
  return null;
}

async function resolveCountry(name: string): Promise<string | null> {
  const iso = countryIso2FromName(name);
  if (!iso) return null;
  const url = flagCdnUrl(iso);
  if (await urlExists(url)) return url;
  return null;
}

async function resolveByStrategy(
  strategy: ImageResolveStrategy,
  name: string,
): Promise<string | null> {
  switch (strategy) {
    case "sports":
      return resolveSports(name);
    case "politics":
      return resolvePolitics(name);
    case "crypto":
      return resolveCrypto(name);
    case "country":
      return resolveCountry(name);
    case "none":
      return null;
  }
}

/** Resolve an option image URL via external APIs. Returns null → client initials. */
export async function resolveOptionImage(
  input: ResolveInput,
): Promise<string | null> {
  const key = optionImageCacheKey(input.category, input.name, input.ticker);
  if (cache.has(key)) return cache.get(key) ?? null;

  const strategy = imageResolveStrategy(input.category, input.name);
  let url: string | null = null;
  if (strategy !== "none") {
    url = await resolveByStrategy(strategy, input.name);
  }

  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, url);
  return url;
}
