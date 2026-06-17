import type { AddonId as PricingAddonId } from "@/lib/pricing";
import type { AddonId as RulesAddonId } from "@/lib/data";

/** Map checkout add-on ids to the ids used by rules/trading state. */
export function toRulesAddonIds(ids: PricingAddonId[]): RulesAddonId[] {
  return ids.map((id) => (id === "90split" ? "split90" : id) as RulesAddonId);
}

/** Accept either checkout or rules add-on ids when resolving purchased upgrades. */
export function hasSplit90Addon(addons: readonly string[]): boolean {
  return addons.includes("split90") || addons.includes("90split");
}
