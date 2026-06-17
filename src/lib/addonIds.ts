import type { AddonId } from "@/lib/pricing";

const LEGACY_ALIASES: Record<string, AddonId> = {
  split90: "90split",
  split95: "90split",
};

const VALID = new Set<AddonId>([
  "90split",
  "drawdown",
  "consistency",
  "doubletime",
  "fastpayout",
]);

/** Canonical add-on ids for database storage and rules — always pricing.ts shape. */
export function normalizePurchasedAddons(raw: readonly string[] | null | undefined): AddonId[] {
  if (!raw?.length) return [];
  const out: AddonId[] = [];
  for (const id of raw) {
    const normalized = LEGACY_ALIASES[id] ?? id;
    if (VALID.has(normalized as AddonId) && !out.includes(normalized as AddonId)) {
      out.push(normalized as AddonId);
    }
  }
  return out;
}

/** Parse a comma-separated checkout URL param into canonical ids. */
export function normalizeAddonsParam(value: string | null | undefined): AddonId[] {
  if (!value) return [];
  return normalizePurchasedAddons(value.split(",").map((s) => s.trim()));
}

/** @deprecated Use normalizePurchasedAddons — kept for callers mid-migration. */
export function toRulesAddonIds(ids: AddonId[]): AddonId[] {
  return normalizePurchasedAddons(ids);
}

export function hasSplit90Addon(addons: readonly string[]): boolean {
  return addons.includes("90split") || addons.includes("split90");
}
