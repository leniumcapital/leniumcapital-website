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
  } catch (e) {
    console.error("Signup failed:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const hint = message.includes("connect")
      ? "Database connection failed. Check Vercel env vars and redeploy."
      : "Something went wrong. Please try again.";
    return NextResponse.json({ error: hint }, { status: 500 });
  }
}
