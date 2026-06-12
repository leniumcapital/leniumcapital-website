"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startNavigationLoading } from "@/components/NavigationLoader";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
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
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300"
        >
          {error}
        </div>
      )}

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
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand"
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
        <Link href="/login" className="font-medium text-brand-strong">
          Log in
        </Link>
      </p>
    </form>
  );
}
