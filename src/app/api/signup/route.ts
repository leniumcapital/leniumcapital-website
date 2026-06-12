import { NextResponse } from "next/server";
import { createUser } from "@/lib/auth-db";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const result = await createUser(
      String(body.name ?? ""),
      String(body.email ?? ""),
      String(body.password ?? ""),
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
