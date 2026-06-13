import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { changeUserPassword } from "@/lib/profile-db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  const result = await changeUserPassword(
    session.user.id,
    String(body.currentPassword ?? ""),
    String(body.newPassword ?? ""),
    String(body.confirmPassword ?? ""),
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, field: result.field },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
