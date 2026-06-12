import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/LoginForm";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { googleEnabled, appleEnabled } from "@/auth";

export const metadata: Metadata = {
  title: "Login",
  description: "Log in to your Lenium trader dashboard.",
};

export default function LoginPage() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05060a] px-6 py-16 text-white">
      {/* Flowing aurora background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="aurora-blob anim-aurora-a"
          style={{
            width: "40rem",
            height: "40rem",
            left: "-14%",
            top: "-6%",
            background:
              "radial-gradient(circle, rgba(30,224,137,0.45), transparent 70%)",
          }}
        />
        <div
          className="aurora-blob anim-aurora-c"
          style={{
            width: "38rem",
            height: "38rem",
            right: "-16%",
            bottom: "-18%",
            background:
              "radial-gradient(circle, rgba(124,92,246,0.4), transparent 70%)",
          }}
        />
        <div className="absolute inset-0 grain opacity-[0.12]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-7 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0b0e13]/70 p-7 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <h1 className="text-center text-xl font-semibold tracking-tight">
            Log in to Lenium
          </h1>
          <p className="mt-1.5 text-center text-sm text-white/60">
            Access your trader dashboard.
          </p>

          {(googleEnabled || appleEnabled) && (
            <>
              <div className="mt-6">
                <SocialAuthButtons
                  googleEnabled={googleEnabled}
                  appleEnabled={appleEnabled}
                  action="Sign in"
                  dark
                />
              </div>

              <div className="mt-6 flex items-center gap-3 text-xs text-white/40">
                <span className="h-px flex-1 bg-white/10" />
                or sign in with email
                <span className="h-px flex-1 bg-white/10" />
              </div>
            </>
          )}

          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm text-white/60">
          No account yet?{" "}
          <Link href="/signup" className="font-medium text-brand">
            Create account
          </Link>
        </p>
      </div>
    </section>
  );
}
