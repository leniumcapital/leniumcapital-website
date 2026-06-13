import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateTwoFactor, type TwoFactorMethod } from "@/lib/profile-db";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    enabled?: boolean;
    method?: TwoFactorMethod;
  };

  const result = await updateTwoFactor(
    session.user.id,
    Boolean(body.enabled),
    body.method,
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, field: result.field },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, profile: result.profile });
}
