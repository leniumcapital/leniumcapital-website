import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const BCRYPT_ROUNDS = 12;

/** Runs once per process — adds profile columns if the deploy missed `db push`. */
let schemaReady: Promise<void> | null = null;

export async function ensureProfileSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT`,
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT`,
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false`,
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorMethod" TEXT`,
      );
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

export function prismaErrorCode(e: unknown): string | undefined {
  return e && typeof e === "object" && "code" in e
    ? String((e as { code: unknown }).code)
    : undefined;
}

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
  twoFactorMethod: string | null;
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  await ensureProfileSchema();
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      twoFactorEnabled: true,
      twoFactorMethod: true,
    },
  });
}

export function validatePhone(phone: string): string | null {
  const value = phone.trim();
  if (!value) return null;
  const digits = value.replace(/[\s().+-]/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return "Enter a valid phone number.";
  }
  return null;
}

export type ProfileUpdateInput = {
  name?: string;
  email?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  currentPassword?: string;
};

export type ProfileUpdateResult =
  | { ok: true; profile: UserProfile }
  | { ok: false; error: string; field?: string };

export async function updateUserProfile(
  userId: string,
  input: ProfileUpdateInput,
): Promise<ProfileUpdateResult> {
  await ensureProfileSchema();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  const data: {
    name?: string;
    email?: string;
    phone?: string | null;
    avatarUrl?: string | null;
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { ok: false, error: "Full name is required.", field: "name" };
    data.name = name;
  }

  if (input.phone !== undefined) {
    const phone = input.phone?.trim() || null;
    if (phone) {
      const err = validatePhone(phone);
      if (err) return { ok: false, error: err, field: "phone" };
    }
    data.phone = phone;
  }

  if (input.avatarUrl !== undefined) {
    data.avatarUrl = input.avatarUrl || null;
  }

  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return { ok: false, error: "Enter a valid email address.", field: "email" };
    }
    if (email !== user.email) {
      if (!input.currentPassword) {
        return {
          ok: false,
          error: "Current password is required to change your email.",
          field: "currentPassword",
        };
      }
      const passwordOk = await bcrypt.compare(input.currentPassword, user.password);
      if (!passwordOk) {
        return { ok: false, error: "Current password is incorrect.", field: "currentPassword" };
      }
      const taken = await prisma.user.findFirst({
        where: { email, NOT: { id: userId } },
      });
      if (taken) {
        return { ok: false, error: "That email is already in use.", field: "email" };
      }
      data.email = email;
    }
  }

  if (Object.keys(data).length === 0) {
    const profile = await getUserProfile(userId);
    if (!profile) return { ok: false, error: "User not found." };
    return { ok: true, profile };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      twoFactorEnabled: true,
      twoFactorMethod: true,
    },
  });

  return { ok: true, profile: updated };
}

export type PasswordChangeResult =
  | { ok: true }
  | { ok: false; error: string; field?: string };

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<PasswordChangeResult> {
  await ensureProfileSchema();
  if (!currentPassword) {
    return { ok: false, error: "Enter your current password.", field: "currentPassword" };
  }
  if (newPassword.length < 8) {
    return {
      ok: false,
      error: "New password must be at least 8 characters.",
      field: "newPassword",
    };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, error: "New passwords do not match.", field: "confirmPassword" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) {
    return { ok: false, error: "Current password is incorrect.", field: "currentPassword" };
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hash },
  });

  return { ok: true };
}

export type TwoFactorMethod = "authenticator" | "sms";

export async function updateTwoFactor(
  userId: string,
  enabled: boolean,
  method?: TwoFactorMethod,
): Promise<ProfileUpdateResult> {
  await ensureProfileSchema();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  if (enabled && !method) {
    return { ok: false, error: "Choose a 2FA method to enable.", field: "method" };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: enabled,
      twoFactorMethod: enabled ? method ?? "authenticator" : null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      twoFactorEnabled: true,
      twoFactorMethod: true,
    },
  });

  return { ok: true, profile: updated };
}

/** Max stored avatar payload (~200 KB base64). */
export const MAX_AVATAR_BYTES = 200_000;

export function validateAvatarDataUrl(dataUrl: string): string | null {
  if (!dataUrl.startsWith("data:image/")) {
    return "Avatar must be a JPEG, PNG, or WebP image.";
  }
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl)) {
    return "Only JPEG, PNG, and WebP images are supported.";
  }
  if (dataUrl.length > MAX_AVATAR_BYTES * 1.4) {
    return "Image is too large. Please use a file under 200 KB.";
  }
  return null;
}
