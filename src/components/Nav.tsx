"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Logo } from "./Logo";
import { StartChallengeCta } from "@/components/StartChallengeCta";
import { resetAllStores } from "@/stores";
import { usd } from "@/lib/data";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/rules", label: "Rules" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;

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

  async function handleLogout() {
    resetAllStores();
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  }

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
          {user ? (
            <>
              <BalancePill balance={user.balance} overlay={overlay} />
              <Link
                href="/dashboard"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-[#04130b] transition-colors hover:bg-brand-strong"
              >
                Go to dashboard
              </Link>
              <ProfileMenu
                name={user.name ?? "Trader"}
                email={user.email ?? ""}
                overlay={overlay}
                onLogout={handleLogout}
              />
            </>
          ) : (
            <>
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
              <StartChallengeCta variant="nav" />
            </>
          )}
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
              {user ? (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm">
                    <span className="text-muted">Balance</span>
                    <span className="font-semibold tabular-nums">
                      {usd(user.balance)}
                    </span>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-brand px-4 py-3 text-center text-sm font-semibold text-[#04130b]"
                  >
                    Go to dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      handleLogout();
                    }}
                    className="rounded-lg border border-border px-4 py-3 text-center text-sm font-medium text-muted hover:text-foreground"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-sm font-medium text-muted"
                  >
                    Login
                  </Link>
                  <StartChallengeCta
                    variant="navMobile"
                    className="w-full"
                    onNavigate={() => setOpen(false)}
                  />
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function BalancePill({ balance, overlay }: { balance: number; overlay: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums ${
        overlay
          ? "border-white/20 bg-white/[0.06] text-white"
          : "border-border bg-surface text-foreground"
      }`}
    >
      <span className="size-1.5 rounded-full bg-brand" />
      {usd(balance)}
    </span>
  );
}

function ProfileMenu({
  name,
  email,
  overlay,
  onLogout,
}: {
  name: string;
  email: string;
  overlay: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const initial = (name || "T").charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`grid size-9 place-items-center rounded-full border text-sm font-semibold transition-colors ${
          overlay
            ? "border-white/25 bg-white/[0.08] text-white"
            : "border-border bg-surface text-foreground"
        }`}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
          <div className="border-b border-border px-4 py-3">
            <div className="truncate text-sm font-semibold text-foreground">
              {name}
            </div>
            <div className="truncate text-xs text-muted">{email}</div>
          </div>
          <nav className="py-1 text-sm">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-foreground hover:bg-surface-muted"
            >
              Dashboard
            </Link>
            <Link
              href="/payouts"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-foreground hover:bg-surface-muted"
            >
              Payouts
            </Link>
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-foreground hover:bg-surface-muted"
            >
              Account
            </Link>
          </nav>
          <div className="border-t border-border py-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="block w-full px-4 py-2 text-left text-sm font-medium text-rose-300 hover:bg-surface-muted"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
