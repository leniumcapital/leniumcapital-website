"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  iconFallbackColor,
  iconFallbackInitials,
  normalizeNameKey,
} from "@/lib/icon-keys";
import { marketImageCandidates } from "@/lib/kalshiImages";

type LoadPhase = "kalshi" | "resolve" | "fallback";

type MarketOutcomeAvatarProps = {
  name: string;
  category: string;
  size?: number;
  directUrl?: string | null;
  /** Market ticker — enables Kalshi market-image CDN fallbacks. */
  marketTicker?: string | null;
};

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const trimmed = u.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function MarketOutcomeAvatarInner({
  name,
  category,
  size = 28,
  directUrl = null,
  marketTicker = null,
}: MarketOutcomeAvatarProps) {
  const kalshiQueue = useMemo(
    () =>
      dedupeUrls([
        ...(directUrl ? [directUrl] : []),
        ...(marketTicker ? marketImageCandidates(marketTicker) : []),
      ]),
    [directUrl, marketTicker],
  );

  const [phase, setPhase] = useState<LoadPhase>("kalshi");
  const [kalshiIndex, setKalshiIndex] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [resolveFailed, setResolveFailed] = useState(false);

  useEffect(() => {
    setPhase(kalshiQueue.length > 0 ? "kalshi" : "resolve");
    setKalshiIndex(0);
    setResolvedUrl(null);
    setResolveFailed(false);
  }, [name, category, directUrl, marketTicker, kalshiQueue]);

  useEffect(() => {
    if (phase !== "resolve") return;

    let cancelled = false;
    const params = new URLSearchParams({ name, category });
    if (marketTicker?.trim()) params.set("ticker", marketTicker.trim());

    fetch(`/api/icons/resolve?${params}`)
      .then((res) => res.json())
      .then((data: { url?: string | null }) => {
        if (cancelled) return;
        if (data.url && typeof data.url === "string" && data.url.trim()) {
          setResolvedUrl(data.url.trim());
        } else {
          setResolveFailed(true);
          setPhase("fallback");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setResolveFailed(true);
        setPhase("fallback");
      });

    return () => {
      cancelled = true;
    };
  }, [phase, name, category, marketTicker]);

  const activeUrl =
    phase === "kalshi"
      ? kalshiQueue[kalshiIndex] ?? null
      : phase === "resolve"
        ? resolvedUrl
        : null;

  const isLoading =
    (phase === "kalshi" && kalshiQueue.length === 0) ||
    (phase === "resolve" && !resolvedUrl && !resolveFailed);

  const showFallback = phase === "fallback" || (phase === "resolve" && resolveFailed);

  const handleImageError = useCallback(() => {
    if (phase === "kalshi") {
      if (kalshiIndex + 1 < kalshiQueue.length) {
        setKalshiIndex((i) => i + 1);
        return;
      }
      setPhase("resolve");
      return;
    }

    if (phase === "resolve" && resolvedUrl) {
      const nameKey = normalizeNameKey(name);
      void fetch("/api/icons/invalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name_key: nameKey }),
      });
      setResolveFailed(true);
      setPhase("fallback");
    }
  }, [phase, kalshiIndex, kalshiQueue.length, resolvedUrl, name]);

  const initials = iconFallbackInitials(name);
  const fallbackBg = iconFallbackColor(category);
  const fontSize = Math.round(size / 2.4);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {isLoading && (
        <div
          className="icon-avatar-shimmer"
          style={{ width: "100%", height: "100%", background: "#1C1C1C" }}
        />
      )}

      {activeUrl && !showFallback && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={activeUrl}
          src={activeUrl}
          alt=""
          width="100%"
          height="100%"
          style={{ objectFit: "cover", display: "block" }}
          onError={handleImageError}
        />
      )}

      {showFallback && (
        <div
          style={{
            background: fallbackBg,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "#FFFFFF",
              fontSize,
              fontWeight: 600,
              lineHeight: 1,
              userSelect: "none",
            }}
          >
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}

function propsEqual(
  prev: MarketOutcomeAvatarProps,
  next: MarketOutcomeAvatarProps,
): boolean {
  return (
    prev.name === next.name &&
    prev.category === next.category &&
    prev.size === next.size &&
    prev.directUrl === next.directUrl &&
    prev.marketTicker === next.marketTicker
  );
}

export default React.memo(MarketOutcomeAvatarInner, propsEqual);
