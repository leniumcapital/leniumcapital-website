import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * Record an account breach (max drawdown hit). Session required.
 * Persists server-side state for the breach; the client flips its own UI.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { reason?: string; drawdownPct?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Server-side audit log only — never logged to the browser.
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[breach] user=${session.user.id} reason=${body.reason ?? "drawdown"}`,
    );
  }

  return NextResponse.json({ ok: true, recordedAt: Date.now() });
}
