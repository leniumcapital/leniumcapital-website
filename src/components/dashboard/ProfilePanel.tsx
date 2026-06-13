"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { IconCamera, IconPencil, IconTrash } from "@tabler/icons-react";
import { useAccountStore } from "@/stores/accountStore";
import {
  DashboardAlert,
  DashboardCard,
  DashboardDivider,
  DashboardField,
  DashboardPage,
  dashboardInputStyle,
  greenButtonStyle,
  secondaryButtonStyle,
} from "@/components/dashboard/DashboardPage";
import { T } from "@/lib/tokens";

type Profile = {
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
  twoFactorMethod: string | null;
};

type EditableField = "name" | "email" | "phone" | null;

export function ProfilePanel() {
  const { update } = useSession();
  const setAccount = useAccountStore((s) => s.setAccount);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState<EditableField>(null);
  const [draft, setDraft] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [savingField, setSavingField] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      const data = (await res.json()) as { profile: Profile };
      setProfile(data.profile);
      setAccount({ name: data.profile.name, email: data.profile.email });
    } catch {
      setError("Could not load your profile. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [setAccount]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  function startEdit(field: EditableField) {
    if (!profile || !field) return;
    setEditing(field);
    setDraft(
      field === "phone" ? profile.phone ?? "" : profile[field],
    );
    setEmailPassword("");
    setError("");
    setMessage("");
  }

  function cancelEdit() {
    setEditing(null);
    setDraft("");
    setEmailPassword("");
  }

  async function saveField(field: EditableField) {
    if (!field || !profile) return;
    setSavingField(true);
    setError("");
    setMessage("");

    const body: Record<string, string | null | undefined> = {};
    if (field === "name") body.name = draft;
    if (field === "email") {
      body.email = draft;
      body.currentPassword = emailPassword;
    }
    if (field === "phone") body.phone = draft || null;

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; profile?: Profile };
      if (!res.ok) {
        setError(data.error ?? "Could not save changes.");
        return;
      }

      const updated = data.profile!;
      setProfile(updated);
      setAccount({ name: updated.name, email: updated.email });
      await update({ user: { name: updated.name, email: updated.email } });
      setEditing(null);
      setMessage(
        field === "phone" && !draft.trim()
          ? "Phone number removed."
          : "Saved successfully.",
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSavingField(false);
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
      setProfile((p) => (p ? { ...p, avatarUrl: data.avatarUrl ?? null } : p));
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
      setProfile((p) => (p ? { ...p, avatarUrl: null } : p));
      setMessage("Profile picture removed.");
    } catch {
      setError("Could not remove image.");
    } finally {
      setUploading(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordError("");
    setPasswordMessage("");

    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setPasswordError(data.error ?? "Could not update password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated successfully.");
    } catch {
      setPasswordError("Something went wrong. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function toggleTwoFactor(enable: boolean) {
    setTwoFactorLoading(true);
    setError("");
    try {
      const res = await fetch("/api/profile/2fa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: enable,
          method: enable ? "authenticator" : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; profile?: Profile };
      if (!res.ok) {
        setError(data.error ?? "Could not update two-factor authentication.");
        return;
      }
      setProfile(data.profile ?? null);
      setMessage(enable ? "Two-factor authentication enabled." : "Two-factor authentication disabled.");
    } catch {
      setError("Could not update two-factor authentication.");
    } finally {
      setTwoFactorLoading(false);
    }
  }

  if (loading || !profile) {
    return (
      <DashboardPage title="Profile">
        <p style={{ color: T.textMuted, fontSize: 14 }}>Loading profile…</p>
      </DashboardPage>
    );
  }

  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <DashboardPage title="Profile">
      {error && <DashboardAlert tone="error">{error}</DashboardAlert>}
      {message && <DashboardAlert tone="success">{message}</DashboardAlert>}

      <DashboardCard title="Personal information">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <EditableRow
            label="Full name"
            value={profile.name}
            editing={editing === "name"}
            draft={draft}
            onEdit={() => startEdit("name")}
            onCancel={cancelEdit}
            onSave={() => void saveField("name")}
            onDraftChange={setDraft}
            saving={savingField && editing === "name"}
            inputType="text"
            placeholder="Jordan Rivera"
          />
          <EditableRow
            label="Email address"
            value={profile.email}
            editing={editing === "email"}
            draft={draft}
            onEdit={() => startEdit("email")}
            onCancel={cancelEdit}
            onSave={() => void saveField("email")}
            onDraftChange={setDraft}
            saving={savingField && editing === "email"}
            inputType="email"
            placeholder="you@example.com"
            extraEditContent={
              editing === "email" ? (
                <DashboardField label="Current password" hint="Required to change your email">
                  <input
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    placeholder="••••••••"
                    style={dashboardInputStyle}
                  />
                </DashboardField>
              ) : null
            }
          />
          <EditableRow
            label="Phone number"
            value={profile.phone || "Not added"}
            mutedValue={!profile.phone}
            editing={editing === "phone"}
            draft={draft}
            onEdit={() => startEdit("phone")}
            onCancel={cancelEdit}
            onSave={() => void saveField("phone")}
            onDraftChange={setDraft}
            saving={savingField && editing === "phone"}
            inputType="tel"
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </DashboardCard>

      <DashboardCard title="Profile picture">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              overflow: "hidden",
              background: T.bgTertiary,
              border: T.hairline(),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
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
              <span style={{ fontSize: 28, fontWeight: 600, color: T.textSecondary }}>
                {initials || "?"}
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
            <div style={{ color: T.textPrimary, fontSize: 16, fontWeight: 500 }}>
              {profile.name}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
                style={secondaryButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = T.bgSecondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = T.bgTertiary;
                }}
              >
                <IconCamera size={16} stroke={1.5} />
                {uploading ? "Uploading…" : "Upload photo"}
              </button>
              {profile.avatarUrl && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void handleRemoveAvatar()}
                  style={{
                    ...secondaryButtonStyle,
                    color: T.red,
                    borderColor: "rgba(239,68,68,0.3)",
                  }}
                >
                  <IconTrash size={16} stroke={1.5} />
                  Remove
                </button>
              )}
            </div>
            <span style={{ fontSize: 11, color: T.textMuted }}>
              JPEG, PNG, or WebP · max 200 KB
            </span>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title="Security">
        <form onSubmit={handlePasswordSave}>
          <div style={{ marginBottom: 8, color: T.textPrimary, fontSize: 14, fontWeight: 500 }}>
            Password
          </div>
          <p style={{ margin: "0 0 14px", color: T.textMuted, fontSize: 13, lineHeight: 1.5 }}>
            Update your password regularly to keep your account secure.
          </p>
          {passwordError && (
            <div style={{ marginBottom: 12 }}>
              <DashboardAlert tone="error">{passwordError}</DashboardAlert>
            </div>
          )}
          {passwordMessage && (
            <div style={{ marginBottom: 12 }}>
              <DashboardAlert tone="success">{passwordMessage}</DashboardAlert>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <DashboardField label="Current password">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                style={dashboardInputStyle}
                autoComplete="current-password"
              />
            </DashboardField>
            <DashboardField label="New password">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                style={dashboardInputStyle}
                autoComplete="new-password"
              />
            </DashboardField>
            <DashboardField label="Confirm new password">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                style={dashboardInputStyle}
                autoComplete="new-password"
              />
            </DashboardField>
            <button
              type="submit"
              disabled={savingPassword}
              style={{
                ...greenButtonStyle,
                alignSelf: "flex-start",
                opacity: savingPassword ? 0.7 : 1,
                cursor: savingPassword ? "wait" : "pointer",
              }}
            >
              {savingPassword ? "Saving…" : "Save password"}
            </button>
          </div>
        </form>

        <DashboardDivider />

        <div style={{ marginTop: 20 }}>
          <div style={{ color: T.textPrimary, fontSize: 14, fontWeight: 500 }}>
            Two-factor authentication
          </div>
          <p style={{ margin: "8px 0 16px", color: T.textMuted, fontSize: 13, lineHeight: 1.5 }}>
            Add an extra layer of security. When enabled, you&apos;ll confirm your identity with a
            second step at sign-in.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: 14,
              background: T.bgTertiary,
              border: T.hairline(),
              borderRadius: T.radius,
            }}
          >
            <div>
              <div style={{ color: T.textPrimary, fontSize: 13, fontWeight: 500 }}>
                Status:{" "}
                <span style={{ color: profile.twoFactorEnabled ? T.green : T.textMuted }}>
                  {profile.twoFactorEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              {profile.twoFactorEnabled && profile.twoFactorMethod && (
                <div style={{ color: T.textMuted, fontSize: 12, marginTop: 4 }}>
                  Active method:{" "}
                  {profile.twoFactorMethod === "sms" ? "SMS" : "Authenticator app"}
                </div>
              )}
            </div>

            {profile.twoFactorEnabled ? (
              <button
                type="button"
                disabled={twoFactorLoading}
                onClick={() => void toggleTwoFactor(false)}
                style={{
                  ...secondaryButtonStyle,
                  color: T.red,
                  borderColor: "rgba(239,68,68,0.3)",
                }}
              >
                {twoFactorLoading ? "Updating…" : "Disable 2FA"}
              </button>
            ) : (
              <button
                type="button"
                disabled={twoFactorLoading}
                onClick={() => void toggleTwoFactor(true)}
                style={greenButtonStyle}
              >
                {twoFactorLoading ? "Enabling…" : "Enable 2FA"}
              </button>
            )}
          </div>
        </div>
      </DashboardCard>
    </DashboardPage>
  );
}

function EditableRow({
  label,
  value,
  mutedValue,
  editing,
  draft,
  onEdit,
  onCancel,
  onSave,
  onDraftChange,
  saving,
  inputType,
  placeholder,
  extraEditContent,
}: {
  label: string;
  value: string;
  mutedValue?: boolean;
  editing: boolean;
  draft: string;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDraftChange: (v: string) => void;
  saving: boolean;
  inputType: string;
  placeholder: string;
  extraEditContent?: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "12px 0",
        borderBottom: T.hairline(),
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <div style={{ color: T.textMuted, fontSize: 12, marginBottom: 4 }}>{label}</div>
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type={inputType}
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                placeholder={placeholder}
                style={dashboardInputStyle}
              />
              {extraEditContent}
            </div>
          ) : (
            <div
              style={{
                color: mutedValue ? T.textMuted : T.textPrimary,
                fontSize: 14,
                fontStyle: mutedValue ? "italic" : "normal",
              }}
            >
              {value}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {editing ? (
            <>
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                style={{ ...greenButtonStyle, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              style={secondaryButtonStyle}
              aria-label={`Edit ${label}`}
            >
              <IconPencil size={14} stroke={1.5} />
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
