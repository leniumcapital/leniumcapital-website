import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  phone: string | null;
  country: string | null;
  avatarUrl: string | null;
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      phone: true,
      country: true,
      avatarUrl: true,
    },
  });
  return user;
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

export function validateUsername(username: string): string | null {
  const value = username.trim();
  if (!value) return null;
  if (!USERNAME_RE.test(value)) {
    return "Username must be 3–30 characters (letters, numbers, underscores).";
  }
  return null;
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
  username?: string | null;
  phone?: string | null;
  country?: string | null;
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
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  const data: {
    name?: string;
    email?: string;
    username?: string | null;
    phone?: string | null;
    country?: string | null;
    avatarUrl?: string | null;
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { ok: false, error: "Full name is required.", field: "name" };
    data.name = name;
  }

  if (input.username !== undefined) {
    const username = input.username?.trim() || null;
    if (username) {
      const err = validateUsername(username);
      if (err) return { ok: false, error: err, field: "username" };
      const taken = await prisma.user.findFirst({
        where: { username, NOT: { id: userId } },
      });
      if (taken) {
        return { ok: false, error: "That username is already taken.", field: "username" };
      }
    }
    data.username = username;
  }

  if (input.phone !== undefined) {
    const phone = input.phone?.trim() || null;
    if (phone) {
      const err = validatePhone(phone);
      if (err) return { ok: false, error: err, field: "phone" };
    }
    data.phone = phone;
  }

  if (input.country !== undefined) {
    data.country = input.country?.trim() || null;
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
      username: true,
      phone: true,
      country: true,
      avatarUrl: true,
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
