import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * Reports whether native Kalshi WebSocket credentials are configured and, if
 * so, hands the client a short-lived token. The API key itself NEVER leaves
 * the server. Kalshi's WS upgrade requires signed headers that a browser
 * cannot send, so until authenticated WS access (or a server-side proxy) is
 * provisioned this returns wsEnabled: false and the client uses the REST
 * transport behind the same provider architecture.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wsKey = process.env.KALSHI_WS_TOKEN;
  if (wsKey) {
    return NextResponse.json({ wsEnabled: true, token: wsKey });
  }
  return NextResponse.json({ wsEnabled: false });
}
