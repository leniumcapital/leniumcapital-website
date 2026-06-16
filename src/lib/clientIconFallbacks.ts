/**
 * Instant client-side icon URL candidates — no API round-trip.
 * Used before /api/icons/resolve for crypto, stocks, flags, and series icons.
 */

import { seriesIconDirectUrl } from "@/lib/seriesIcon";
import { marketImageCandidates } from "@/lib/kalshiImages";

const COINGECKO = "https://assets.coingecko.com/coins/images";

const CRYPTO_ICONS: Record<string, string> = {
  btc: `${COINGECKO}/1/small/bitcoin.png`,
  bitcoin: `${COINGECKO}/1/small/bitcoin.png`,
  eth: `${COINGECKO}/279/small/ethereum.png`,
  ethereum: `${COINGECKO}/279/small/ethereum.png`,
  sol: `${COINGECKO}/4128/small/solana.png`,
  solana: `${COINGECKO}/4128/small/solana.png`,
  doge: `${COINGECKO}/5/small/dogecoin.png`,
  dogecoin: `${COINGECKO}/5/small/dogecoin.png`,
  xrp: `${COINGECKO}/44/small/xrp-symbol-white-128.png`,
  ripple: `${COINGECKO}/44/small/xrp-symbol-white-128.png`,
  ada: `${COINGECKO}/975/small/cardano.png`,
  cardano: `${COINGECKO}/975/small/cardano.png`,
  avax: `${COINGECKO}/12559/small/Avalanche_Circle_RedWhite_Trans.png`,
  avalanche: `${COINGECKO}/12559/small/Avalanche_Circle_RedWhite_Trans.png`,
  matic: `${COINGECKO}/4713/small/matic-token-icon.png`,
  polygon: `${COINGECKO}/4713/small/matic-token-icon.png`,
  link: `${COINGECKO}/877/small/chainlink-new-logo.png`,
  chainlink: `${COINGECKO}/877/small/chainlink-new-logo.png`,
};

const STOCK_LOGOS: Record<string, string> = {
  tsla: "https://logo.clearbit.com/tesla.com",
  tesla: "https://logo.clearbit.com/tesla.com",
  sbux: "https://logo.clearbit.com/starbucks.com",
  starbucks: "https://logo.clearbit.com/starbucks.com",
  aapl: "https://logo.clearbit.com/apple.com",
  apple: "https://logo.clearbit.com/apple.com",
  amzn: "https://logo.clearbit.com/amazon.com",
  amazon: "https://logo.clearbit.com/amazon.com",
  goog: "https://logo.clearbit.com/google.com",
  google: "https://logo.clearbit.com/google.com",
  meta: "https://logo.clearbit.com/meta.com",
  nvda: "https://logo.clearbit.com/nvidia.com",
  nvidia: "https://logo.clearbit.com/nvidia.com",
  msft: "https://logo.clearbit.com/microsoft.com",
  microsoft: "https://logo.clearbit.com/microsoft.com",
  nflx: "https://logo.clearbit.com/netflix.com",
  netflix: "https://logo.clearbit.com/netflix.com",
  coin: "https://logo.clearbit.com/coinbase.com",
  coinbase: "https://logo.clearbit.com/coinbase.com",
};

const FLAG_BY_NAME: Record<string, string> = {
  norway: "https://flagcdn.com/w80/no.png",
  iraq: "https://flagcdn.com/w80/iq.png",
  usa: "https://flagcdn.com/w40/us.png",
  "united states": "https://flagcdn.com/w40/us.png",
  uk: "https://flagcdn.com/w80/gb.png",
  "united kingdom": "https://flagcdn.com/w80/gb.png",
  france: "https://flagcdn.com/w80/fr.png",
  germany: "https://flagcdn.com/w80/de.png",
  spain: "https://flagcdn.com/w80/es.png",
  italy: "https://flagcdn.com/w80/it.png",
  brazil: "https://flagcdn.com/w80/br.png",
  argentina: "https://flagcdn.com/w80/ar.png",
  mexico: "https://flagcdn.com/w80/mx.png",
  canada: "https://flagcdn.com/w80/ca.png",
  japan: "https://flagcdn.com/w80/jp.png",
  china: "https://flagcdn.com/w80/cn.png",
  india: "https://flagcdn.com/w80/in.png",
  australia: "https://flagcdn.com/w80/au.png",
};

function dedupe(urls: string[]): string[] {
  const seen = new Set<string>();
  return urls.filter((u) => {
    const t = u.trim();
    if (!t || seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}

function detectCryptoSymbol(...texts: (string | undefined | null)[]): string | null {
  const blob = texts.filter(Boolean).join(" ").toLowerCase();
  if (/\bbtc\b|bitcoin/.test(blob)) return CRYPTO_ICONS.btc;
  if (/\beth\b|ethereum/.test(blob)) return CRYPTO_ICONS.eth;
  if (/\bsol\b|solana/.test(blob)) return CRYPTO_ICONS.sol;
  if (/\bdoge\b|dogecoin/.test(blob)) return CRYPTO_ICONS.doge;
  if (/\bxrp\b|ripple/.test(blob)) return CRYPTO_ICONS.xrp;
  if (/\bada\b|cardano/.test(blob)) return CRYPTO_ICONS.ada;
  if (/\bavax\b|avalanche/.test(blob)) return CRYPTO_ICONS.avax;
  if (/\bmatic\b|polygon/.test(blob)) return CRYPTO_ICONS.matic;
  if (/\blink\b|chainlink/.test(blob)) return CRYPTO_ICONS.link;
  if (/kxbtc/i.test(blob)) return CRYPTO_ICONS.btc;
  if (/kxeth/i.test(blob)) return CRYPTO_ICONS.eth;
  if (/kxsol/i.test(blob)) return CRYPTO_ICONS.sol;
  return null;
}

function detectStockLogo(...texts: (string | undefined | null)[]): string | null {
  const blob = texts.filter(Boolean).join(" ").toLowerCase();
  for (const [key, url] of Object.entries(STOCK_LOGOS)) {
    if (new RegExp(`\\b${key}\\b`).test(blob)) return url;
  }
  return null;
}

function detectFlag(name: string): string | null {
  const lower = name.toLowerCase().trim();
  if (FLAG_BY_NAME[lower]) return FLAG_BY_NAME[lower];
  for (const [country, url] of Object.entries(FLAG_BY_NAME)) {
    if (lower.includes(country)) return url;
  }
  return null;
}

export type IconContext = {
  name: string;
  category: string;
  directUrl?: string | null;
  marketTicker?: string | null;
  seriesTicker?: string | null;
  eventTitle?: string | null;
};

/** Ordered instant icon candidates for MarketOutcomeAvatar. */
export function clientIconCandidates(ctx: IconContext): string[] {
  const urls: string[] = [];
  const { name, category, directUrl, marketTicker, seriesTicker, eventTitle } = ctx;

  if (directUrl?.trim()) urls.push(directUrl.trim());

  const crypto =
    category === "Crypto"
      ? detectCryptoSymbol(eventTitle, seriesTicker, marketTicker, name)
      : detectCryptoSymbol(eventTitle, seriesTicker, marketTicker);
  if (crypto) urls.push(crypto);

  const stock = detectStockLogo(eventTitle, name, seriesTicker);
  if (stock) urls.push(stock);

  const flag = detectFlag(name);
  if (flag) urls.push(flag);

  if (seriesTicker) {
    const series = seriesIconDirectUrl(seriesTicker);
    if (series) urls.push(series);
  }

  if (marketTicker) {
    urls.push(...marketImageCandidates(marketTicker));
  }

  // Party colors for generic election outcomes
  if (category === "Elections" || category === "Politics") {
    const lower = name.toLowerCase();
    if (/democrat|democratic|biden|harris|blue/.test(lower)) {
      urls.push("https://kalshi.com/cdn-images/override_images/core/Democratic.webp");
    }
    if (/republican|gop|trump|red|vance|rubio/.test(lower)) {
      urls.push("https://kalshi.com/cdn-images/override_images/core/Republican.webp");
    }
  }

  return dedupe(urls);
}
