/**
 * Lenium dashboard design tokens. Single source of truth — every dashboard
 * component imports from here so the palette can never drift.
 */
export const T = {
  bgPrimary: "#0A0A0A",
  bgSecondary: "#111111",
  bgTertiary: "#161616",
  border: "#1C1C1C",
  borderHover: "#2C2C2C",
  green: "#00E87A",
  greenMutedBg: "rgba(0, 232, 122, 0.07)",
  greenMutedBorder: "#1A3A20",
  textPrimary: "#FFFFFF",
  textSecondary: "#888888",
  textMuted: "#555555",
  amber: "#F59E0B",
  amberMuted: "rgba(245, 158, 11, 0.1)",
  red: "#EF4444",
  redMuted: "rgba(239, 68, 68, 0.1)",
  font: "var(--font-inter, Inter), Inter, system-ui, sans-serif",
  radius: 8,
  radiusLg: 12,
  radiusPill: 999,
  transition: "150ms ease",
  /** Hairline border shorthand. */
  hairline: (color: string = "#1C1C1C") => `0.5px solid ${color}`,
} as const;

export const TOP_BAR_HEIGHT = 56;
export const SIDEBAR_WIDTH = 260;
export const DRAWER_WIDTH = 420;
export const MIN_VIEWPORT_WIDTH = 1280;

/** Card heights for react-window virtualization. */
export const GRID_CARD_HEIGHT = 180;
export const LIST_ROW_HEIGHT = 64;
