"use client";

import { useSyncExternalStore } from "react";
import { useConnectionStore } from "@/stores/connectionStore";
import { T } from "@/lib/tokens";

const STALE_AFTER_MS = 15_000;

// Time modeled as an external store (5s resolution) so the dot can go amber
// when the feed silently stops, without impure Date.now() calls in render.
function subscribeTicker(onChange: () => void): () => void {
  const id = setInterval(onChange, 5_000);
  return () => clearInterval(id);
}
const getTick = () => Math.floor(Date.now() / 5_000);

/** Live-feed indicator: green only while real data is actually flowing. */
export function ConnectionStatus() {
  const status = useConnectionStore((s) => s.status);
  const lastUpdate = useConnectionStore((s) => s.lastUpdateTimestamp);
  const tick = useSyncExternalStore(subscribeTicker, getTick, getTick);

  const stale = lastUpdate > 0 && tick * 5_000 - lastUpdate > STALE_AFTER_MS;
  const live = status === "connected" && !stale;

  const color = live
    ? T.green
    : status === "disconnected"
      ? T.red
      : T.amber;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          animation: live ? "lenium-pulse 2s infinite" : undefined,
        }}
      />
      <span style={{ color: T.textMuted, fontSize: 12 }}>
        {live ? "Live" : "Reconnecting"}
      </span>
    </div>
  );
}
