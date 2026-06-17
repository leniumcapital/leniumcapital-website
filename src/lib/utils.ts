/** Linearly blend two hex colors. Ratio 0 → colorA, 1 → colorB. */
export function interpolateColors(
  colorA: string,
  colorB: string,
  ratio: number,
): string {
  const t = Math.min(1, Math.max(0, ratio));
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return rgbToHex(r, g, bl);
}

/** Map a 0–100 probability to the dashboard probability-bar color scale. */
export function getProbabilityColor(probability: number): string {
  const p = Math.min(100, Math.max(0, probability));

  if (p >= 65) return "#00E87A";
  if (p >= 35) {
    return interpolateColors("#F59E0B", "#00E87A", (p - 35) / (65 - 35));
  }
  if (p >= 15) {
    return interpolateColors("#EF4444", "#F97316", (p - 15) / (34 - 15));
  }
  return "#EF4444";
}

/** Normalize raw outcome prices so displayed bars sum to ~100%. */
export function normalizeOutcomeProbabilities(prices: number[]): number[] {
  const sum = prices.reduce((acc, price) => acc + Math.max(0, price), 0);
  if (sum <= 0) return prices.map(() => 0);
  return prices.map((price) => (Math.max(0, price) / sum) * 100);
}

/** Binary YES/NO cards only show a bar on the YES row. */
export function shouldShowOutcomeBar(
  outcomes: { name: string }[],
  index: number,
): boolean {
  if (outcomes.length === 0) return false;
  if (outcomes.length === 1) return true;
  const yesNo = outcomes.every((o) => /^(yes|no)$/i.test(o.name.trim()));
  if (!yesNo) return true;
  return /^yes$/i.test(outcomes[index]?.name.trim() ?? "");
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const num = Number.parseInt(value, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}
