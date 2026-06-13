"use client";

import { useState } from "react";
import {
  seriesIconUrl,
  marketImageCandidates,
  KALSHI_CDN,
} from "@/lib/kalshiImages";
import { T } from "@/lib/tokens";

const CATEGORY_ICONS: Record<string, string> = {
  Economics: "📈",
  Politics: "🏛️",
  Sports: "🏆",
  Crypto: "₿",
  Culture: "🎬",
  Climate: "🌎",
  "Tech and Science": "🔬",
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

/** Sport-specific series icon overrides when the generic series asset is missing. */
const SERIES_OVERRIDES: Record<string, string> = {
  KXNBAGAME: `${KALSHI_CDN}/override_images/sports/Basketball-NBA.webp`,
  KXWNBAGAME: `${KALSHI_CDN}/override_images/sports/Basketball-WNBA.webp`,
  KXNFLGAME: `${KALSHI_CDN}/override_images/sports/Football-NFL.webp`,
  KXMLBGAME: `${KALSHI_CDN}/override_images/sports/Baseball-MLB.webp`,
  KXNHLGAME: `${KALSHI_CDN}/override_images/sports/Hockey-NHL.webp`,
  KXWTAMATCH: `${KALSHI_CDN}/override_images/sports/Tennis-WTA.webp`,
  KXATPMATCH: `${KALSHI_CDN}/override_images/sports/Tennis-ATP.webp`,
  KXUCLGAME: `${KALSHI_CDN}/override_images/sports/Soccer-UEFA.webp`,
  KXEPLGAME: `${KALSHI_CDN}/override_images/sports/Soccer-EPL.webp`,
  KXPRESNOMD: `${KALSHI_CDN}/override_images/core/Democratic.webp`,
  KXPRESNOMR: `${KALSHI_CDN}/override_images/core/Republican.webp`,
};

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

function InitialsFallback({ name, size }: { name: string; size: number }) {
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

/** Event/series icon from Kalshi's CDN, with sport-specific override fallbacks. */
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
  const candidates = [
    seriesIconUrl(seriesTicker),
    SERIES_OVERRIDES[seriesTicker],
  ].filter((u): u is string => Boolean(u));

  return (
    <CdnImage
      candidates={candidates}
      size={size}
      radius={radius}
      fallback={
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
      }
    />
  );
}

/**
 * Outcome avatar: team flag, league logo, or candidate photo from Kalshi's CDN.
 * Uses a server-resolved imageUrl when available; otherwise walks the
 * market-images extension chain before falling back to initials.
 */
export function OutcomeAvatar({
  ticker,
  name,
  imageUrl,
  size = 26,
}: {
  ticker: string;
  name: string;
  /** Pre-resolved CDN URL from structured-target lookup (preferred). */
  imageUrl?: string;
  size?: number;
}) {
  const candidates = [
    ...(imageUrl ? [imageUrl] : []),
    ...marketImageCandidates(ticker),
  ];

  return (
    <CdnImage
      candidates={candidates}
      size={size}
      radius="50%"
      fallback={<InitialsFallback name={name} size={size} />}
    />
  );
}

/** Tries a list of CDN URLs in order; renders fallback when all fail. */
function CdnImage({
  candidates,
  size,
  radius,
  fallback,
}: {
  candidates: string[];
  size: number;
  radius: number | string;
  fallback: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);

  if (index >= candidates.length) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={candidates[index]}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setIndex((i) => i + 1)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        objectFit: "cover",
        background: T.bgTertiary,
        border: T.hairline(T.borderHover),
        flexShrink: 0,
      }}
    />
  );
}
