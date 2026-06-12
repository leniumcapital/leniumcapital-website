"use client";

import { useConnectionStore } from "@/stores/connectionStore";
import { T } from "@/lib/tokens";

/** Live-feed indicator: pulsing green dot when connected. */
export function ConnectionStatus() {
  const status = useConnectionStore((s) => s.status);

  const color =
    status === "connected"
      ? T.green
      : status === "reconnecting"
        ? T.amber
        : T.red;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          animation:
            status === "connected" ? "lenium-pulse 2s infinite" : undefined,
        }}
      />
      <span style={{ color: T.textMuted, fontSize: 12 }}>
        {status === "connected" ? "Live" : "Reconnecting"}
      </span>
    </div>
  );
}
