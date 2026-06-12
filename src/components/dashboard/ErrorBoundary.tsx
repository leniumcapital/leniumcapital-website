"use client";

import React from "react";
import { T } from "@/lib/tokens";

interface ErrorBoundaryProps {
  /** Shown in the fallback so the user knows which section failed. */
  name: string;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Catches render errors in a subtree and shows a reload fallback. */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[${this.props.name}]`, error);
    }
  }

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: 32,
          background: T.bgSecondary,
          border: T.hairline(),
          borderRadius: T.radiusLg,
          margin: 16,
          fontFamily: T.font,
        }}
      >
        <span style={{ color: T.textPrimary, fontSize: 14, fontWeight: 500 }}>
          {this.props.name} failed to load
        </span>
        <span style={{ color: T.textMuted, fontSize: 12, textAlign: "center" }}>
          {this.state.error.message}
        </span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8,
            background: T.bgTertiary,
            border: T.hairline(),
            borderRadius: T.radius,
            color: T.textPrimary,
            fontSize: 12,
            padding: "6px 14px",
            cursor: "pointer",
            transition: `border-color ${T.transition}`,
          }}
        >
          Reload section
        </button>
      </div>
    );
  }
}
