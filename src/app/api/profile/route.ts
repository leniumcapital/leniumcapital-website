import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserProfile, updateUserProfile } from "@/lib/profile-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getUserProfile(session.user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    name?: string;
    email?: string;
    phone?: string | null;
    currentPassword?: string;
  };

  const result = await updateUserProfile(session.user.id, body);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, field: result.field },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, profile: result.profile });
}
