"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Site-wide smooth navigation transitions.
 *
 * Every internal link click starts a pending timer; if the destination page
 * is not on screen within SHOW_DELAY_MS the branded overlay fades in, and it
 * fades back out once the route actually changes. Fast (prefetched)
 * navigations never see the overlay, so nothing ever flashes.
 */

const SHOW_DELAY_MS = 120;
const FADE_OUT_MS = 280;
const SAFETY_TIMEOUT_MS = 10_000;

type Phase = "idle" | "pending" | "visible" | "leaving";

// Programmatic navigations (router.push after login, etc.) call this.
let externalStart: ((immediate?: boolean) => void) | null = null;

/** Show the branded navigation overlay. Pass true to skip the brief delay. */
export function startNavigationLoading(immediate = true): void {
  externalStart?.(immediate);
}

function NavigationLoaderInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPhaseSafe = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearTimers = useCallback(() => {
    for (const t of [showTimer, hideTimer, safetyTimer]) {
      if (t.current) {
        clearTimeout(t.current);
        t.current = null;
      }
    }
  }, []);

  const begin = useCallback((immediate = false) => {
    if (phaseRef.current === "pending" || phaseRef.current === "visible") return;
    clearTimers();
    if (immediate) {
      setPhaseSafe("visible");
    } else {
      setPhaseSafe("pending");
      showTimer.current = setTimeout(() => {
        if (phaseRef.current === "pending") setPhaseSafe("visible");
      }, SHOW_DELAY_MS);
    }
    safetyTimer.current = setTimeout(() => {
      clearTimers();
      setPhaseSafe("idle");
    }, SAFETY_TIMEOUT_MS);
  }, [clearTimers, setPhaseSafe]);

  const finish = useCallback(() => {
    if (phaseRef.current === "idle") return;
    clearTimers();
    if (phaseRef.current === "visible") {
      // Fade the overlay out over the freshly rendered page.
      setPhaseSafe("leaving");
      hideTimer.current = setTimeout(() => setPhaseSafe("idle"), FADE_OUT_MS);
    } else {
      setPhaseSafe("idle");
    }
  }, [clearTimers, setPhaseSafe]);

  // Route changed → the new page is on screen.
  useEffect(() => {
    finish();
  }, [pathname, searchParams, finish]);

  // Expose programmatic start (challenge CTA, login form, etc.).
  useEffect(() => {
    externalStart = begin;
    return () => {
      externalStart = null;
    };
  }, [begin]);

  // Intercept internal link clicks anywhere in the document.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Hash-only change on the same page — no route transition.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      begin();
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [begin]);

  // Browser back/forward — usually instant, but cover slow restores too.
  useEffect(() => {
    function onPopState() {
      begin();
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [begin]);

  if (phase !== "visible" && phase !== "leaving") return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10, 10, 10, 0.88)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: phase === "leaving" ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms ease`,
        animation: "lenium-overlay-in 200ms ease",
        pointerEvents: phase === "leaving" ? "none" : "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div className="lenium-loader-mark">
          <BrandedLoaderMark />
        </div>
        <div className="lenium-loader-track">
          <div className="lenium-loader-sweep" />
        </div>
      </div>
    </div>
  );
}

function BrandedLoaderMark() {
  return (
    <svg width={44} height={44} viewBox="0 0 40 40" fill="none" aria-label="Loading">
      <rect x="1" y="1" width="38" height="38" rx="8" fill="#00E87A" />
      <path d="M13 10 H18 V23 H27 V28 H13 Z" fill="#0A0A0A" />
    </svg>
  );
}

/** Mounted once in the root layout. */
export function NavigationLoader() {
  return (
    <Suspense fallback={null}>
      <NavigationLoaderInner />
    </Suspense>
  );
}
