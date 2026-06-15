import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Early withdrawal is no longer offered under the Lenium rules framework. */
export async function POST() {
  return NextResponse.json(
    { error: "Early withdrawal is not available" },
    { status: 410 },
  );
}
