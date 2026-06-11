import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 40 40" width={32} height={32}>
          <rect x="1" y="1" width="38" height="38" rx="8" fill="#00E87A" />
          <path d="M13 10 H18 V23 H27 V28 H13 Z" fill="#0A0A0A" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
