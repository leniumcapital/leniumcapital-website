import { resetAllStores } from "@/stores";

const PERSISTED_KEYS = ["lenium-positions", "lenium-challenge"] as const;
const ACTIVE_USER_KEY = "lenium-active-user";

/** Drop persisted trading state so a new login never inherits another user's data. */
export function clearPersistedTradingState(): void {
  resetAllStores();
  if (typeof window === "undefined") return;
  for (const key of PERSISTED_KEYS) {
    window.localStorage.removeItem(key);
  }
}

/** Remember which user owns client-side trading state; clear on user change. */
export function ensureTradingStateForUser(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  const prev = window.localStorage.getItem(ACTIVE_USER_KEY);
  if (prev && prev !== userId) {
    clearPersistedTradingState();
  }
  window.localStorage.setItem(ACTIVE_USER_KEY, userId);
}

export function clearActiveUserMarker(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTIVE_USER_KEY);
}
