"use client";

import { useRouter } from "next/navigation";
import { startNavigationLoading } from "@/components/NavigationLoader";

const VARIANT_CLASS: Record<string, string> = {
  hero:
    "inline-flex items-center justify-center rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-[#04130b] transition-colors hover:bg-brand-strong",
  nav: "rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-[#04130b] transition-colors hover:bg-brand-strong",
  navMobile:
    "rounded-lg bg-brand px-4 py-3 text-center text-sm font-semibold text-[#04130b]",
  cta:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-[#04130b] transition-colors hover:bg-brand-strong",
};

/**
 * Marketing-site primary CTA — shows the branded loader overlay, then
 * navigates to the login page.
 */
export function StartChallengeCta({
  children = "Start your challenge",
  variant = "hero",
  className = "",
  onNavigate,
}: {
  children?: React.ReactNode;
  variant?: keyof typeof VARIANT_CLASS;
  className?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();

  function handleClick() {
    onNavigate?.();
    startNavigationLoading();
    router.push("/login");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${VARIANT_CLASS[variant]} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
