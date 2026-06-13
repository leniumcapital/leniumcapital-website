import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserProfile, prismaErrorCode, updateUserProfile } from "@/lib/profile-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await getUserProfile(session.user.id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (e) {
    const code = prismaErrorCode(e);
    console.error("Profile GET failed:", e);
    return NextResponse.json(
      {
        error:
          code === "P2022"
            ? "Profile database columns are syncing. Refresh in a few seconds."
            : "Could not load profile.",
        code,
      },
      { status: 500 },
    );
  }
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

  try {
    const result = await updateUserProfile(session.user.id, body);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, field: result.field },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, profile: result.profile });
  } catch (e) {
    const code = prismaErrorCode(e);
    console.error("Profile PATCH failed:", e);
    return NextResponse.json(
      { error: "Could not save profile.", code },
      { status: 500 },
    );
  }
}
