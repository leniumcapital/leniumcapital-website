"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  seriesIconUrl,
  marketImageCandidates,
  KALSHI_CDN,
} from "@/lib/kalshiImages";
import {
  optionColor,
  optionInitials,
} from "@/lib/optionImage";
import { fetchResolvedOptionImage } from "@/lib/optionImageCache";
import { T } from "@/lib/tokens";

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

/** Colored circle with white initials — always visible as the final fallback. */
export function InitialsCircle({
  name,
  size,
  color,
  radius = "50%",
}: {
  name: string;
  size: number;
  color?: string;
  radius?: number | string;
}) {
  const bg = color ?? optionColor(name);
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: bg,
        color: "#FFFFFF",
        fontSize: Math.max(9, size * 0.36),
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        letterSpacing: "0.02em",
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      {optionInitials(name)}
    </span>
  );
}

type OptionImageProps = {
  name: string;
  category: string;
  ticker?: string;
  /** Pre-resolved URL from market data (Kalshi CDN, metadata, etc.). */
  imageUrl?: string;
  /** Extra CDN / override candidates tried before API lookup. */
  extraCandidates?: string[];
  size?: number;
  radius?: number | string;
  /** Explicit outcome color (chart legend, progress bars). */
  color?: string;
  colorIndex?: number;
};

/**
 * Universal option image: Kalshi URLs → API lookup → colored initials circle.
 * The initials circle is always rendered underneath so the slot is never blank.
 */
export function OptionImage({
  name,
  category,
  ticker,
  imageUrl,
  extraCandidates = [],
  size = 26,
  radius = "50%",
  color,
  colorIndex,
}: OptionImageProps) {
  const circleColor = optionColor(name, color, colorIndex);
  const allCandidates = useMemo(() => {
    const list = [
      ...(imageUrl ? [imageUrl] : []),
      ...extraCandidates,
      ...(ticker ? marketImageCandidates(ticker) : []),
    ].filter((u, i, arr) => Boolean(u) && arr.indexOf(u) === i);
    return list;
  }, [imageUrl, extraCandidates, ticker]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [apiTried, setApiTried] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const apiRequested = useRef(false);

  const activeUrl =
    candidateIdx < allCandidates.length
      ? allCandidates[candidateIdx]
      : apiUrl;

  const showImage = Boolean(activeUrl) && loaded;

  const advance = useCallback(() => {
    setLoaded(false);
    if (candidateIdx < allCandidates.length - 1) {
      setCandidateIdx((i) => i + 1);
      return;
    }
    if (!apiTried && !apiRequested.current) {
      apiRequested.current = true;
      void fetchResolvedOptionImage(name, category, ticker).then((url) => {
        setApiTried(true);
        if (url) setApiUrl(url);
      });
    }
  }, [
    allCandidates.length,
    apiTried,
    candidateIdx,
    category,
    name,
    ticker,
  ]);

  useEffect(() => {
    setCandidateIdx(0);
    setApiUrl(null);
    setApiTried(false);
    setLoaded(false);
    apiRequested.current = false;
  }, [name, category, ticker, imageUrl, allCandidates.join("|")]);

  useEffect(() => {
    if (candidateIdx >= allCandidates.length && !apiTried && !apiRequested.current) {
      apiRequested.current = true;
      void fetchResolvedOptionImage(name, category, ticker).then((url) => {
        setApiTried(true);
        if (url) setApiUrl(url);
      });
    }
  }, [allCandidates.length, apiTried, candidateIdx, category, name, ticker]);

  return (
    <span
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        flexShrink: 0,
        verticalAlign: "middle",
      }}
    >
      <InitialsCircle
        name={name}
        size={size}
        color={circleColor}
        radius={radius}
      />
      {activeUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={activeUrl}
          src={activeUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={advance}
          style={{
            position: "absolute",
            inset: 0,
            width: size,
            height: size,
            borderRadius: radius,
            objectFit: "cover",
            opacity: showImage ? 1 : 0,
            transition: "opacity 120ms ease",
            background: T.bgTertiary,
          }}
        />
      )}
    </span>
  );
}

/** Event/series icon from Kalshi CDN with initials fallback. */
export function SeriesIcon({
  seriesTicker,
  category,
  title,
  size = 24,
  radius = 6,
}: {
  seriesTicker: string;
  category: string;
  /** Event title used for initials when CDN assets are missing. */
  title?: string;
  size?: number;
  radius?: number;
}) {
  const candidates = [
    seriesIconUrl(seriesTicker),
    SERIES_OVERRIDES[seriesTicker],
  ].filter((u): u is string => Boolean(u));

  return (
    <OptionImage
      name={title ?? category}
      category={category}
      extraCandidates={candidates}
      size={size}
      radius={radius}
    />
  );
}

/**
 * Outcome avatar for market options — team logos, flags, headshots, coin icons.
 * Used on event cards, detail tables, order panel, and chart legends.
 */
export function OutcomeAvatar({
  ticker,
  name,
  category,
  imageUrl,
  size = 26,
  color,
  colorIndex,
}: {
  ticker: string;
  name: string;
  category: string;
  imageUrl?: string;
  size?: number;
  color?: string;
  colorIndex?: number;
}) {
  return (
    <OptionImage
      name={name}
      category={category}
      ticker={ticker}
      imageUrl={imageUrl}
      size={size}
      color={color}
      colorIndex={colorIndex}
    />
  );
}
