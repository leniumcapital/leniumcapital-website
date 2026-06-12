"use client";

import { useState } from "react";
import { T } from "@/lib/tokens";

/**
 * Kalshi's public CDN image assets, keyed by ticker. Series icons are always
 * webp; market (outcome) images vary by extension and many don't exist, so
 * the avatar walks an extension chain and falls back to an initials circle —
 * the same progressive behavior as Kalshi's own cards.
 */

const CDN = "https://kalshi.com/cdn-images";
const MARKET_IMG_EXTS = ["webp", "png", "jpg"] as const;

const CATEGORY_ICONS: Record<string, string> = {
  Economics: "📈",
  Politics: "🏛️",
  Sports: "🏆",
  Crypto: "₿",
  Culture: "🎬",
  Climate: "🌎",
  "Science and Tech": "🔬",
  Health: "🩺",
};

const AVATAR_COLORS = [
  "#1E3A5F",
  "#3D2E4F",
  "#1F4038",
  "#4A3320",
  "#3A2030",
  "#27384D",
] as const;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Event/series icon from Kalshi's CDN, with a category-emoji fallback. */
export function SeriesIcon({
  seriesTicker,
  category,
  size = 24,
  radius = 6,
}: {
  seriesTicker: string;
  category: string;
  size?: number;
  radius?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !seriesTicker) {
    return (
      <span
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: T.bgTertiary,
          border: T.hairline(),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.5,
          flexShrink: 0,
        }}
      >
        {CATEGORY_ICONS[category] ?? "◆"}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${CDN}/series-images-webp/${encodeURIComponent(seriesTicker)}.webp?size=sm`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        objectFit: "cover",
        background: T.bgTertiary,
        flexShrink: 0,
      }}
    />
  );
}

/**
 * Outcome avatar: the real Kalshi market image (candidate photo, team flag)
 * when one exists, otherwise a deterministic initials circle.
 */
export function OutcomeAvatar({
  ticker,
  name,
  size = 26,
}: {
  ticker: string;
  name: string;
  size?: number;
}) {
  const [extIndex, setExtIndex] = useState(0);

  if (extIndex >= MARKET_IMG_EXTS.length) {
    const bg = AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];
    return (
      <span
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: bg,
          border: T.hairline(T.borderHover),
          color: "#C9D4E0",
          fontSize: size * 0.38,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          letterSpacing: "0.02em",
        }}
      >
        {initials(name)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${CDN}/market-images/${encodeURIComponent(ticker)}.${MARKET_IMG_EXTS[extIndex]}`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setExtIndex((i) => i + 1)}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        background: T.bgTertiary,
        border: T.hairline(T.borderHover),
        flexShrink: 0,
      }}
    />
  );
}
