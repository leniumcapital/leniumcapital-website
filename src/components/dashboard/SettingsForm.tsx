"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { IconCamera, IconTrash } from "@tabler/icons-react";
import { useAccountStore } from "@/stores/accountStore";
import { COUNTRIES } from "@/lib/countries";
import { T } from "@/lib/tokens";

type Profile = {
  name: string;
  email: string;
  username: string | null;
  phone: string | null;
  country: string | null;
  avatarUrl: string | null;
};

export function SettingsForm() {
  const { update } = useSession();
  const setAccount = useAccountStore((s) => s.setAccount);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [profile, setProfile] = useState<Profile>({
    name: "",
    email: "",
    username: null,
    phone: null,
    country: null,
    avatarUrl: null,
  });
  const [emailDraft, setEmailDraft] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      const data = (await res.json()) as { profile: Profile };
      setProfile(data.profile);
      setEmailDraft(data.profile.email);
      setAccount({
        name: data.profile.name,
        email: data.profile.email,
        username: data.profile.username ?? "",
        phone: data.profile.phone ?? "",
        country: data.profile.country ?? "",
        avatarUrl: data.profile.avatarUrl ?? "",
      });
    } catch {
      setError("Could not load your profile. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [setAccount]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const emailChanged = emailDraft.trim().toLowerCase() !== profile.email.toLowerCase();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          username: profile.username || null,
          phone: profile.phone || null,
          country: profile.country || null,
          email: emailDraft,
          currentPassword: emailChanged ? currentPassword : undefined,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        field?: string;
        profile?: Profile;
      };

      if (!res.ok) {
        setError(data.error ?? "Could not save changes.");
        return;
      }

      const updated = data.profile!;
      setProfile(updated);
      setEmailDraft(updated.email);
      setCurrentPassword("");
      setMessage("Profile updated successfully.");

      setAccount({
        name: updated.name,
        email: updated.email,
        username: updated.username ?? "",
        phone: updated.phone ?? "",
        country: updated.country ?? "",
        avatarUrl: updated.avatarUrl ?? "",
      });

      await update({
        user: {
          name: updated.name,
          email: updated.email,
        },
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(file: File) {
    setUploading(true);
    setError("");
    setMessage("");

    const form = new FormData();
    form.append("avatar", file);

    try {
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const data = (await res.json()) as { error?: string; avatarUrl?: string };

      if (!res.ok) {
        setError(data.error ?? "Could not upload image.");
        return;
      }

      const avatarUrl = data.avatarUrl ?? null;
      setProfile((p) => ({ ...p, avatarUrl }));
      setAccount({ avatarUrl: avatarUrl ?? "" });
      setMessage("Profile picture updated.");
    } catch {
      setError("Could not upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    setUploading(true);
    setError("");
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Could not remove image.");
        return;
      }
      setProfile((p) => ({ ...p, avatarUrl: null }));
      setAccount({ avatarUrl: "" });
      setMessage("Profile picture removed.");
    } catch {
      setError("Could not remove image.");
    } finally {
      setUploading(false);
    }
  }

  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  if (loading) {
    return (
      <p style={{ color: T.textMuted, fontSize: 14, fontFamily: T.font }}>
        Loading profile…
      </p>
    );
  }

  return (
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      {/* Profile picture */}
      <Section title="Profile picture">
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              overflow: "hidden",
              background: T.bgTertiary,
              border: T.hairline(),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              position: "relative",
            }}
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: 24, fontWeight: 600, color: T.textSecondary }}>
                {initials || "?"}
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleAvatarUpload(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              style={secondaryBtn}
            >
              <IconCamera size={16} stroke={1.5} />
              {uploading ? "Uploading…" : "Upload photo"}
            </button>
            {profile.avatarUrl && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => void handleRemoveAvatar()}
                style={{ ...secondaryBtn, color: T.red, borderColor: "rgba(239,68,68,0.3)" }}
              >
                <IconTrash size={16} stroke={1.5} />
                Remove
              </button>
            )}
            <span style={{ fontSize: 11, color: T.textMuted }}>
              JPEG, PNG, or WebP · max 200 KB
            </span>
          </div>
        </div>
      </Section>

      {/* Personal info */}
      <Section title="Personal information">
        <Field label="Full name">
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            placeholder="Jordan Rivera"
            style={inputStyle}
            required
          />
        </Field>
        <Field label="Username" hint="Letters, numbers, underscores · 3–30 chars">
          <input
            type="text"
            value={profile.username ?? ""}
            onChange={(e) =>
              setProfile((p) => ({
                ...p,
                username: e.target.value.replace(/[^a-zA-Z0-9_]/g, ""),
              }))
            }
            placeholder="jordan_trades"
            style={inputStyle}
          />
        </Field>
      </Section>

      {/* Contact */}
      <Section title="Contact">
        <Field label="Email address">
          <input
            type="email"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            placeholder="you@example.com"
            style={inputStyle}
            required
          />
        </Field>
        {emailChanged && (
          <Field label="Current password" hint="Required to change your email">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              required
            />
          </Field>
        )}
        <Field label="Phone number">
          <input
            type="tel"
            value={profile.phone ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
            placeholder="+1 (555) 123-4567"
            style={inputStyle}
          />
        </Field>
      </Section>

      {/* Location */}
      <Section title="Location">
        <Field label="Country">
          <select
            value={profile.country ?? ""}
            onChange={(e) =>
              setProfile((p) => ({ ...p, country: e.target.value || null }))
            }
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="">Select your country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <button
        type="submit"
        disabled={saving}
        style={{
          alignSelf: "flex-start",
          background: T.green,
          color: T.bgPrimary,
          border: "none",
          borderRadius: 8,
          padding: "12px 24px",
          fontSize: 14,
          fontWeight: 600,
          cursor: saving ? "wait" : "pointer",
          opacity: saving ? 0.7 : 1,
          fontFamily: T.font,
        }}
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: T.bgSecondary,
        border: T.hairline(),
        borderRadius: T.radiusLg,
        padding: 20,
      }}
    >
      <div
        style={{
          color: T.green,
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 16,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ color: T.textPrimary, fontSize: 13, fontWeight: 500 }}>{label}</span>
      {hint && <span style={{ color: T.textMuted, fontSize: 11, marginTop: -4 }}>{hint}</span>}
      {children}
    </label>
  );
}

function Alert({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const isError = tone === "error";
  return (
    <div
      role="alert"
      style={{
        borderRadius: 8,
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: T.bgTertiary,
  border: T.hairline(),
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  color: T.textPrimary,
  fontFamily: T.font,
  outline: "none",
};

const secondaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: T.bgTertiary,
  border: T.hairline(),
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 500,
  color: T.textPrimary,
  cursor: "pointer",
  fontFamily: T.font,
};
