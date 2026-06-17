import { NextResponse } from "next/server";
import { auth, signIn } from "@/auth";
import { authConfigIssues } from "@/lib/auth-env";
import { createUser, verifyCredentials } from "@/lib/auth-db";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const email = String(body.email ?? "");
    const password = String(body.password ?? "");
    const normalized = email.trim().toLowerCase();

    const result = await createUser(
      String(body.name ?? ""),
      email,
      password,
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const configIssues = authConfigIssues();
    if (configIssues.length > 0) {
      return NextResponse.json(
        {
          ok: true,
          signedIn: false,
          error: `Account created, but session setup is incomplete: ${configIssues.join("; ")}.`,
        },
        { status: 201 },
      );
    }

    const verified = await verifyCredentials(normalized, password);
    if (!verified) {
      return NextResponse.json(
        {
          ok: true,
          signedIn: false,
          error:
            "Account was created but automatic sign-in failed. Try logging in with your email and password.",
        },
        { status: 201 },
      );
    }

    try {
      const redirectTo = await signIn("credentials", {
        email: normalized,
        password,
        redirect: false,
      });

      if (
        typeof redirectTo === "string" &&
        (redirectTo.includes("error=") || redirectTo.includes("signin?"))
      ) {
        return NextResponse.json(
          {
            ok: true,
            signedIn: false,
            error:
              "Account was created but automatic sign-in failed. Try logging in with your email and password.",
          },
          { status: 201 },
        );
      }
    } catch (signInError) {
      console.error("Post-signup signIn failed:", signInError);
      return NextResponse.json(
        {
          ok: true,
          signedIn: false,
          error:
            "Account was created but automatic sign-in failed. Try logging in with your email and password.",
        },
        { status: 201 },
      );
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        {
          ok: true,
          signedIn: false,
          error:
            "Account was created but no session was started. Try logging in with your email and password.",
        },
        { status: 201 },
      );
    }

    return NextResponse.json({ ok: true, signedIn: true });
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
