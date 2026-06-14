"use client";

import React, { useEffect, useState } from "react";
import {
  iconFallbackColor,
  iconFallbackInitials,
  normalizeNameKey,
} from "@/lib/icon-keys";

type AvatarStatus = "loading" | "resolved" | "fallback";

type MarketOutcomeAvatarProps = {
  name: string;
  category: string;
  size?: number;
  directUrl?: string | null;
};

function MarketOutcomeAvatarInner({
  name,
  category,
  size = 28,
  directUrl = null,
}: MarketOutcomeAvatarProps) {
  const [status, setStatus] = useState<AvatarStatus>("loading");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    if (directUrl && directUrl.trim()) {
      setStatus("resolved");
      setImageUrl(directUrl.trim());
      setHasImageError(false);
      return;
    }

    setStatus("loading");
    setImageUrl(null);
    setHasImageError(false);

    const params = new URLSearchParams({ name, category });
    fetch(`/api/icons/resolve?${params}`)
      .then((res) => res.json())
      .then((data: { url?: string | null }) => {
        if (data.url && typeof data.url === "string" && data.url.trim()) {
          setStatus("resolved");
          setImageUrl(data.url.trim());
        } else {
          setStatus("fallback");
        }
      })
      .catch(() => setStatus("fallback"));
  }, [name, category, directUrl]);

  const initials = iconFallbackInitials(name);
  const fallbackBg = iconFallbackColor(category);
  const fontSize = Math.round(size / 2.4);

  const handleImageError = () => {
    setHasImageError(true);
    setStatus("fallback");
    const nameKey = normalizeNameKey(name);
    void fetch("/api/icons/invalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name_key: nameKey }),
    });
  };

  const showFallback = status === "fallback" || hasImageError;

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
      {status === "loading" && (
        <div
          className="icon-avatar-shimmer"
          style={{ width: "100%", height: "100%", background: "#1C1C1C" }}
        />
      )}

      {status === "resolved" && !hasImageError && imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
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
    prev.directUrl === next.directUrl
  );
}

export default React.memo(MarketOutcomeAvatarInner, propsEqual);
