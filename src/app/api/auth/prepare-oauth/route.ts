import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { safeCallbackUrl } from "@/lib/callback-url";

const POST_AUTH_COOKIE = "lenium_post_auth";
const MAX_AGE = 60 * 10; // 10 minutes — enough for OAuth round trip

/** Stash the post-auth destination before Google OAuth (fallback if callbackUrl is lost). */
export async function POST(req: Request) {
  let body: { callbackUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const callbackUrl = safeCallbackUrl(body.callbackUrl);
  const cookieStore = await cookies();
  cookieStore.set(POST_AUTH_COOKIE, callbackUrl, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });

  return NextResponse.json({ ok: true });
}
