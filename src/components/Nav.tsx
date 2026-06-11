"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/rules", label: "Rules" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Transparent, light-on-dark nav while sitting over the homepage hero.
  const overlay = pathname === "/" && !scrolled && !open;

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        overlay
          ? "border-b border-transparent bg-transparent text-white"
          : "border-b border-border bg-background/80 text-foreground backdrop-blur-md"
      }`}
    >
      <div className="flex h-16 w-full items-center justify-between px-6 sm:px-10">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                overlay
                  ? "text-white/75 hover:text-white"
                  : isActive(l.href)
                    ? "text-foreground"
                    : "text-muted hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              overlay
                ? "text-white/75 hover:text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-[#04130b] transition-colors hover:bg-brand-strong"
          >
            Start your challenge
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className={`grid size-9 place-items-center rounded-lg border ${
              overlay ? "border-white/25 text-white" : "border-border text-foreground"
            }`}
          >
            {open ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="flex w-full flex-col px-6 py-3">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-3 text-sm font-medium ${
                  isActive(l.href) ? "text-foreground" : "text-muted"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-muted"
              >
                Login
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-brand px-4 py-3 text-center text-sm font-semibold text-[#04130b]"
              >
                Start your challenge
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
