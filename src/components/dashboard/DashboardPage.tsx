"use client";

import type { CSSProperties, ReactNode } from "react";
import { T } from "@/lib/tokens";

export const dashboardInputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: T.bgTertiary,
  border: T.hairline(),
  borderRadius: T.radius,
  padding: "10px 12px",
  fontSize: 14,
  color: T.textPrimary,
  fontFamily: T.font,
  outline: "none",
};

export const greenButtonStyle: CSSProperties = {
  background: T.green,
  color: T.bgPrimary,
  border: "none",
  borderRadius: T.radius,
  padding: "10px 20px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: T.font,
  transition: `opacity ${T.transition}`,
};

export const secondaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: T.bgTertiary,
  border: T.hairline(),
  borderRadius: T.radius,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 500,
  color: T.textPrimary,
  cursor: "pointer",
  fontFamily: T.font,
  transition: `background ${T.transition}, border-color ${T.transition}`,
};

export function DashboardPage({
  title,
  children,
  maxWidth = 720,
}: {
  title: string;
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <div style={{ padding: "24px 32px 40px", maxWidth, fontFamily: T.font }}>
      <h1
        style={{
          margin: 0,
          color: T.textPrimary,
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h1>
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        {children}
      </div>
    </div>
  );
}

export function DashboardCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        background: T.bgSecondary,
        border: T.hairline(),
        borderRadius: T.radiusLg,
        padding: 20,
      }}
    >
      <h2
        style={{
          margin: "0 0 16px",
          color: T.green,
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export function DashboardField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ color: T.textPrimary, fontSize: 13, fontWeight: 500 }}>{label}</span>
      {hint && (
        <span style={{ color: T.textMuted, fontSize: 11, marginTop: -2 }}>{hint}</span>
      )}
      {children}
    </label>
  );
}

export function DashboardAlert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  const isError = tone === "error";
  return (
    <div
      role="alert"
      style={{
        borderRadius: T.radius,
        padding: "10px 14px",
        fontSize: 13,
        border: isError ? "1px solid rgba(239,68,68,0.35)" : `1px solid ${T.greenMutedBorder}`,
        background: isError ? "rgba(239,68,68,0.1)" : T.greenMutedBg,
        color: isError ? T.red : T.green,
        fontFamily: T.font,
      }}
    >
      {children}
    </div>
  );
}

export function DashboardDivider() {
  return <div style={{ height: 0.5, background: T.border, margin: "4px 0" }} />;
}
