"use client";

import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { T } from "@/lib/tokens";

export default function SettingsPage() {
  return (
    <ErrorBoundary name="Settings">
      <div style={{ padding: 32, maxWidth: 720, fontFamily: T.font }}>
        <h1
          style={{
            margin: 0,
            color: T.textPrimary,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          Settings
        </h1>
        <p style={{ marginTop: 8, marginBottom: 28, fontSize: 14, color: T.textMuted }}>
          Manage your profile, contact details, and preferences.
        </p>

        <SettingsForm />
      </div>
    </ErrorBoundary>
  );
}
