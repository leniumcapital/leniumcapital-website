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
  greenBtnBg: "rgba(0, 232, 122, 0.1)",
  greenBtnBorder: "rgba(0, 232, 122, 0.35)",
  textPrimary: "#FFFFFF",
  textSecondary: "#888888",
  textMuted: "#555555",
  amber: "#F59E0B",
  amberMuted: "rgba(245, 158, 11, 0.1)",
  red: "#EF4444",
  redMuted: "rgba(239, 68, 68, 0.1)",
  redMutedBg: "rgba(239, 68, 68, 0.07)",
  redMutedBorder: "#3A1A1A",
  redBtnBg: "rgba(239, 68, 68, 0.1)",
  redBtnBorder: "rgba(239, 68, 68, 0.35)",
  font: "var(--font-inter, Inter), Inter, system-ui, sans-serif",
  radius: 8,
  radiusLg: 12,
  radiusPill: 999,
  transition: "150ms ease",
  /** Hairline border shorthand. */
  hairline: (color: string = "#1C1C1C") => `0.5px solid ${color}`,
} as const;

/** Compact Yes/No trade pill — green for Yes, red for No, every market. */
export function tradeSidePillStyle(side: "yes" | "no") {
  const isYes = side === "yes";
  return {
    background: isYes ? T.greenBtnBg : T.redBtnBg,
    border: T.hairline(isYes ? T.greenBtnBorder : T.redBtnBorder),
    color: isYes ? T.green : T.red,
    borderRadius: 6,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: T.font,
    whiteSpace: "nowrap" as const,
  };
}

/** Large Yes/No toggle in order panels — tinted by side even when inactive. */
export function tradeSidePanelStyle(side: "yes" | "no", selected: boolean) {
  const isYes = side === "yes";
  return {
    flex: 1,
    height: 52,
    borderRadius: 8,
    cursor: "pointer",
    background: selected
      ? isYes
        ? T.greenBtnBg
        : T.redBtnBg
      : isYes
        ? "rgba(0, 232, 122, 0.04)"
        : T.redMuted,
    border: selected
      ? `1.5px solid ${isYes ? T.green : T.red}`
      : T.hairline(isYes ? T.greenBtnBorder : T.redBtnBorder),
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    transition: `border-color ${T.transition}, background ${T.transition}`,
    fontFamily: T.font,
  };
}

export const TOP_BAR_HEIGHT = 56;
export const SIDEBAR_WIDTH = 260;
export const DRAWER_WIDTH = 420;
// Allows iPads in landscape (1024px+); phones and portrait tablets get the
// "best on desktop" guard instead of a broken layout.
export const MIN_VIEWPORT_WIDTH = 620;

/** Card heights for react-window virtualization. */
export const GRID_CARD_HEIGHT = 180;
export const LIST_ROW_HEIGHT = 64;
