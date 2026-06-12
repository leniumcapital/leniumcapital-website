import { LeniumMark } from "@/components/ui/LeniumLogo";

interface BrandedLoaderProps {
  /** Fill the whole viewport (route loading states). */
  fullScreen?: boolean;
}

/**
 * The Lenium loading state: pulsing seal mark over a green progress sweep.
 * Pure CSS animations so it renders instantly, server or client.
 */
export function BrandedLoader({ fullScreen = false }: BrandedLoaderProps) {
  return (
    <div
      style={
        fullScreen
          ? {
              position: "fixed",
              inset: 0,
              zIndex: 90,
              background: "#0A0A0A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }
          : {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60vh",
            }
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div className="lenium-loader-mark">
          <LeniumMark size={44} variant="green" />
        </div>
        <div className="lenium-loader-track">
          <div className="lenium-loader-sweep" />
        </div>
      </div>
    </div>
  );
}
