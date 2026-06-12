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
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: unknown }).code)
        : undefined;
    const message = e instanceof Error ? e.message : "Unknown error";

    let hint = "Something went wrong. Please try again.";
    if (code === "P2002") {
      hint = "An account with this email already exists.";
      return NextResponse.json({ error: hint }, { status: 400 });
    }
    if (
      message.toLowerCase().includes("authentication failed") ||
      code === "P1000"
    ) {
      hint =
        "Database password is wrong in Vercel. Update POSTGRES_PRISMA_URL and POSTGRES_URL_NON_POOLING with the correct password, then redeploy.";
    } else if (
      code === "P1001" ||
      code === "P1017" ||
      message.toLowerCase().includes("connect")
    ) {
      hint =
        "Database connection failed. Confirm Supabase is on the same Vercel project as lenium.capital, then redeploy.";
    } else if (code === "P2021") {
      hint =
        "Database tables are missing. Run the User/TradingAccount SQL in Supabase again.";
    }

    return NextResponse.json({ error: hint, code }, { status: 500 });
  }
}
