import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { AuthPanel } from "@/components/AuthPanel";

export const metadata: Metadata = {
  title: "Create account",
  description:
    "Create your free Lenium account or log in. No payment required to sign up — you only pay when you start a challenge.",
};

const HIGHLIGHTS = [
  "Free to create — no card required to sign up",
  "Pay only when you choose a challenge",
  "Payouts in real US dollars, up to 95% profit split",
];

function Check() {
  return (
    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}

type PageProps = {
  searchParams: Promise<{ mode?: string; callbackUrl?: string }>;
};

export default async function SignupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialMode = params.mode === "login" ? "login" : "signup";
  const callbackUrl =
    typeof params.callbackUrl === "string" && params.callbackUrl.startsWith("/")
      ? params.callbackUrl
      : "/dashboard";

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
            Join{" "}
            <span className="font-serif italic text-brand">the future</span>{" "}
            of trading.
          </h2>
          <p className="mt-4 text-base text-white/65">
            Create your account in seconds. It&apos;s free to sign up — you only
            pay when you&apos;re ready to start a challenge.
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

      {/* Form panel — signup and login on one page */}
      <div className="flex items-center justify-center px-6 py-16 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <Suspense fallback={<AuthPanelSkeleton />}>
            <AuthPanel initialMode={initialMode} callbackUrl={callbackUrl} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}

function AuthPanelSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded-lg bg-surface-muted" />
      <div className="h-4 w-64 rounded bg-surface-muted" />
      <div className="mt-7 h-10 rounded-xl bg-surface-muted" />
      <div className="h-10 rounded-xl bg-surface-muted" />
      <div className="h-10 rounded-xl bg-surface-muted" />
    </div>
  );
}
