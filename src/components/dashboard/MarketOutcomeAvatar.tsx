"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  iconFallbackColor,
  iconFallbackInitials,
  normalizeNameKey,
} from "@/lib/icon-keys";
import { clientIconCandidates } from "@/lib/clientIconFallbacks";

type LoadPhase = "candidates" | "resolve" | "fallback";

type MarketOutcomeAvatarProps = {
  name: string;
  category: string;
  size?: number;
  directUrl?: string | null;
  marketTicker?: string | null;
  seriesTicker?: string | null;
  eventTitle?: string | null;
};

function MarketOutcomeAvatarInner({
  name,
  category,
  size = 28,
  directUrl = null,
  marketTicker = null,
  seriesTicker = null,
  eventTitle = null,
}: MarketOutcomeAvatarProps) {
  const candidateQueue = useMemo(
    () =>
      clientIconCandidates({
        name,
        category,
        directUrl,
        marketTicker,
        seriesTicker,
        eventTitle,
      }),
    [name, category, directUrl, marketTicker, seriesTicker, eventTitle],
  );

  const [phase, setPhase] = useState<LoadPhase>(
    candidateQueue.length > 0 ? "candidates" : "resolve",
  );
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [resolveFailed, setResolveFailed] = useState(false);

  useEffect(() => {
    setPhase(candidateQueue.length > 0 ? "candidates" : "resolve");
    setCandidateIndex(0);
    setResolvedUrl(null);
    setResolveFailed(false);
  }, [name, category, directUrl, marketTicker, seriesTicker, eventTitle, candidateQueue]);

  useEffect(() => {
    if (phase !== "resolve") return;

    let cancelled = false;
    const params = new URLSearchParams({ name, category });
    if (marketTicker?.trim()) params.set("ticker", marketTicker.trim());
    if (seriesTicker?.trim()) params.set("series", seriesTicker.trim());
    if (eventTitle?.trim()) params.set("context", eventTitle.trim());

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
  }, [phase, name, category, marketTicker, seriesTicker, eventTitle]);

  const activeUrl =
    phase === "candidates"
      ? candidateQueue[candidateIndex] ?? null
      : phase === "resolve"
        ? resolvedUrl
        : null;

  const showFallback =
    phase === "fallback" || (phase === "resolve" && resolveFailed && !resolvedUrl);
  const showShimmer = !showFallback && !activeUrl;

  const handleImageError = useCallback(() => {
    if (phase === "candidates") {
      if (candidateIndex + 1 < candidateQueue.length) {
        setCandidateIndex((i) => i + 1);
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
  }, [phase, candidateIndex, candidateQueue.length, resolvedUrl, name]);

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
        background: showShimmer ? "#1C1C1C" : fallbackBg,
      }}
    >
      {showShimmer && (
        <div
          className="lenium-avatar-shimmer"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "linear-gradient(90deg, #1C1C1C 0%, #2A2A2A 50%, #1C1C1C 100%)",
            backgroundSize: "200% 100%",
            animation: "lenium-shimmer 1.5s ease-in-out infinite",
          }}
        />
      )}
      {showFallback && (
        <span
          style={{
            color: "#FFFFFF",
            fontSize,
            fontWeight: 600,
            lineHeight: 1,
            userSelect: "none",
            zIndex: 1,
          }}
        >
          {initials}
        </span>
      )}

      {activeUrl && !showFallback && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={activeUrl}
          src={activeUrl}
          alt=""
          width="100%"
          height="100%"
          style={{
            objectFit: "cover",
            display: "block",
            position: "absolute",
            inset: 0,
          }}
          onError={handleImageError}
        />
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
    prev.marketTicker === next.marketTicker &&
    prev.seriesTicker === next.seriesTicker &&
    prev.eventTitle === next.eventTitle
  );
}

export default React.memo(MarketOutcomeAvatarInner, propsEqual);
