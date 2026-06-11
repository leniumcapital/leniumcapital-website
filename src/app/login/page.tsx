import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Login",
  description: "Log in to your Lenium trader dashboard.",
};

const HIGHLIGHTS = [
  "Built on Kalshi, a CFTC-licensed exchange",
  "Payouts in real US dollars, straight to your bank",
  "Profit splits up to 95% in your favor",
];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8a12 12 0 1 1 0-24c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 384 512" fill="currentColor" aria-hidden>
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM262.1 104.5c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function Check() {
  return (
    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}

export default function LoginPage() {
  return (
    <section className="relative grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-[#05060a] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="aurora-blob anim-aurora-a"
            style={{
              width: "40rem",
              height: "40rem",
              left: "-18%",
              top: "0%",
              background:
                "radial-gradient(circle, rgba(30,224,137,0.5), transparent 70%)",
            }}
          />
          <div
            className="aurora-blob anim-aurora-c"
            style={{
              width: "38rem",
              height: "38rem",
              right: "-20%",
              bottom: "-15%",
              background:
                "radial-gradient(circle, rgba(124,92,246,0.4), transparent 70%)",
            }}
          />
          <div
            className="aurora-blob anim-aurora-b"
            style={{
              width: "30rem",
              height: "30rem",
              right: "-8%",
              top: "-10%",
              background:
                "radial-gradient(circle, rgba(45,212,191,0.35), transparent 70%)",
            }}
          />
          <div className="absolute inset-0 grain opacity-[0.12]" />
        </div>

        <div className="relative z-10">
          <Logo />
        </div>

        <div className="relative z-10 max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-brand" />
            The first CFTC-regulated prediction market prop firm
          </span>
          <h2 className="mt-6 text-4xl font-semibold leading-tight tracking-tight">
            Welcome back to{" "}
            <span className="font-serif italic text-brand">the future</span>{" "}
            of trading.
          </h2>
          <p className="mt-4 text-base text-white/65">
            Pick up where you left off — track your challenge, manage your funded
            account, and cash out in real dollars.
          </p>
        </div>

        <ul className="relative z-10 space-y-3">
          {HIGHLIGHTS.map((h) => (
            <li key={h} className="flex items-start gap-3 text-sm text-white/80">
              <Check />
              {h}
            </li>
          ))}
        </ul>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-16 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            Log in to Lenium
          </h1>
          <p className="mt-2 text-sm text-muted">
            Access your challenge or funded account dashboard.
          </p>

          <div className="mt-7 space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold transition-colors hover:bg-surface-muted"
            >
              <GoogleIcon />
              Continue with Google
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold transition-colors hover:bg-surface-muted"
            >
              <AppleIcon />
              Continue with Apple
            </button>
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            or continue with email
            <span className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium">
                  Password
                </label>
                <Link
                  href="#"
                  className="text-xs font-medium text-muted hover:text-foreground"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand"
              />
            </div>
            <button
              type="button"
              className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-[#04130b] transition-colors hover:bg-brand-strong"
            >
              Log in
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            No account yet?{" "}
            <Link href="/signup" className="font-medium text-brand-strong">
              Create one — it&apos;s free
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
