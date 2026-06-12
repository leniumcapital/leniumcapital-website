import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateUserProfile, validateAvatarDataUrl } from "@/lib/profile-db";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Upload a profile picture (stored as a data URL in the database). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("avatar");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image file provided." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, and WebP images are supported." },
      { status: 400 },
    );
  }

  if (file.size > 200_000) {
    return NextResponse.json(
      { error: "Image must be under 200 KB." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mime = file.type;
  const dataUrl = `data:${mime};base64,${base64}`;

  const validationError = validateAvatarDataUrl(dataUrl);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const result = await updateUserProfile(session.user.id, { avatarUrl: dataUrl });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, avatarUrl: result.profile.avatarUrl });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await updateUserProfile(session.user.id, { avatarUrl: null });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
