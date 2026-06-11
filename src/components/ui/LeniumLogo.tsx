type Variant = "green" | "outline" | "white" | "bare";

interface LeniumMarkProps {
  size?: number;
  variant?: Variant;
  className?: string;
}

interface LeniumLogoProps extends LeniumMarkProps {
  showWordmark?: boolean;
}

const palette: Record<
  Variant,
  { fill: string; path: string; stroke?: string }
> = {
  green: { fill: "#00E87A", path: "#0A0A0A" }, // green seal — use in nav, hero
  outline: { fill: "#111111", path: "#00E87A", stroke: "#00E87A" }, // outlined — use in footer
  white: { fill: "#FFFFFF", path: "#0A0A0A" }, // white seal — use on colored bgs
  bare: { fill: "transparent", path: "#00E87A" }, // just the L — ultra minimal
};

// ─── Mark only (just the green square icon) ───────────────────────────────────
export function LeniumMark({
  size = 32,
  variant = "green",
  className,
}: LeniumMarkProps) {
  const c = palette[variant];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-label="Lenium"
    >
      {variant !== "bare" && (
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="8"
          fill={c.fill}
          stroke={c.stroke ?? "none"}
          strokeWidth={c.stroke ? 1.5 : 0}
        />
      )}
      <path d="M13 10 H18 V23 H27 V28 H13 Z" fill={c.path} />
    </svg>
  );
}

// ─── Full logo (mark + wordmark) ──────────────────────────────────────────────
export function LeniumLogo({
  size = 28,
  variant = "green",
  showWordmark = true,
  className,
}: LeniumLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <LeniumMark size={size} variant={variant} />
      {showWordmark && (
        <div className="flex flex-col" style={{ lineHeight: 1 }}>
          <span
            style={{
              fontSize: size * 0.57,
              letterSpacing: "0.18em",
              fontWeight: 300,
              color: "#ffffff",
            }}
          >
            Lenium
          </span>
          <span
            style={{
              fontSize: size * 0.24,
              letterSpacing: "0.16em",
              fontWeight: 300,
              color: "#444444",
              marginTop: 3,
            }}
          >
            .capital
          </span>
        </div>
      )}
    </div>
  );
}

export type { Variant as LeniumVariant };
