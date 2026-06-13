"use client";

import { optionImageCacheKey } from "@/lib/optionImage";

const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

/** Client-side cache for API-resolved option image URLs. */
export async function fetchResolvedOptionImage(
  name: string,
  category: string,
  ticker?: string,
): Promise<string | null> {
  const key = optionImageCacheKey(category, name, ticker);
  if (cache.has(key)) return cache.get(key) ?? null;

  let pending = inflight.get(key);
  if (!pending) {
    const params = new URLSearchParams({ name, category });
    if (ticker) params.set("ticker", ticker);
    pending = fetch(`/api/images/resolve?${params}`)
      .then((r) => (r.ok ? r.json() : { url: null }))
      .then((d: { url?: string | null }) => d.url ?? null)
      .catch(() => null)
      .finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }

  const url = await pending;
  cache.set(key, url);
  return url;
}

export function peekResolvedOptionImage(
  name: string,
  category: string,
  ticker?: string,
): string | null | undefined {
  const key = optionImageCacheKey(category, name, ticker);
  return cache.get(key);
}
