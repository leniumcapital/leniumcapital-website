"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startNavigationLoading } from "@/components/NavigationLoader";

export type AuthMode = "signup" | "login";

type AuthPanelProps = {
  initialMode?: AuthMode;
  callbackUrl?: string;
};

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand";

export function AuthPanel({
  initialMode = "signup",
  callbackUrl = "/dashboard",
}: AuthPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Keep form mode in sync with ?mode=login in the URL (no page change).
  useEffect(() => {
    setMode(searchParams.get("mode") === "login" ? "login" : "signup");
  }, [searchParams]);

  function switchMode(next: AuthMode) {
    setError("");
    setMode(next);

    const params = new URLSearchParams(searchParams.toString());
    if (next === "login") {
      params.set("mode", "login");
    } else {
      params.delete("mode");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = (await res.json()) as { error?: string; code?: string };

    if (!res.ok) {
      setLoading(false);
      const detail = data.code ? ` (${data.code})` : "";
      setError(
        (data.error ?? "Could not create account. Please try again.") + detail,
      );
      return;
    }

    const login = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (!login || login.error) {
      setError(
        "Account may have been created, but sign-in failed. Try logging in — if that fails, AUTH_SECRET may be missing on Vercel.",
      );
      return;
    }

    startNavigationLoading();
    router.push(callbackUrl);
    router.refresh();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (!res || res.error) {
      setError("Incorrect email or password. Please try again.");
      return;
    }
    startNavigationLoading();
    router.push(callbackUrl);
    router.refresh();
  }

  if (mode === "login") {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-2 text-sm text-muted">
          Access your trader dashboard.
        </p>

        <form className="mt-7 space-y-4" onSubmit={handleLogin} noValidate>
          {error && <AuthError message={error} />}

          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-[#04130b] transition-colors hover:bg-brand-strong disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-center text-sm text-muted">
            No account yet?{" "}
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className="font-medium text-brand-strong hover:underline"
            >
              Create account
            </button>
          </p>
        </form>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-muted">
        Free to start. No payment until you choose a challenge.
      </p>

      <form className="mt-7 space-y-4" onSubmit={handleSignup} noValidate>
        {error && <AuthError message={error} />}

        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Rivera"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="signup-password" className="mb-1.5 block text-sm font-medium">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-muted">At least 8 characters.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-[#04130b] transition-colors hover:bg-brand-strong disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="text-center text-xs text-muted">
          By creating an account you agree to our Terms and Privacy Policy.
        </p>

        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="font-medium text-brand-strong hover:underline"
          >
            Log in
          </button>
        </p>
      </form>
    </>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300"
    >
      {message}
    </div>
  );
}
