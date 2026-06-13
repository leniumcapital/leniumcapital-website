"use client";

import { useEffect, useRef, useState } from "react";
import { IconSearch, IconChevronDown } from "@tabler/icons-react";
import { useUiStore, type SortOrder } from "@/stores/uiStore";
import {
  useMarketsQuery,
  useFilteredEventTickers,
  MARKETS_SORT_OPTIONS,
} from "@/hooks/useMarkets";
import { MarketsCategorySidebar } from "@/components/dashboard/MarketsCategorySidebar";
import { MarketGrid } from "@/components/dashboard/MarketGrid";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { T } from "@/lib/tokens";

export default function MarketsPage() {
  useMarketsQuery();
  const { heading } = useFilteredEventTickers();

  useEffect(() => {
    const main = document.getElementById("lenium-main");
    const top = useUiStore.getState().marketsScrollTop;
    if (main && top > 0) main.scrollTop = top;
  }, []);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100%",
        fontFamily: T.font,
      }}
    >
      <MarketsCategorySidebar />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "24px 24px 20px",
            borderBottom: T.hairline(),
          }}
        >
          <h1
            style={{
              margin: 0,
              color: T.textPrimary,
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            {heading}
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <EventSearchInput />
            <SortDropdown />
          </div>
        </header>

        <div style={{ padding: "24px 24px 48px" }}>
          <ErrorBoundary name="Market grid">
            <MarketGrid />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

function EventSearchInput() {
  const eventSearch = useUiStore((s) => s.eventSearch);
  const setEventSearch = useUiStore((s) => s.setEventSearch);
  const [focused, setFocused] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "min(260px, 32vw)",
        height: 36,
        padding: "0 12px",
        background: T.bgTertiary,
        border: `0.5px solid ${focused ? T.borderHover : T.border}`,
        borderRadius: T.radiusPill,
        transition: `border-color ${T.transition}`,
      }}
    >
      <IconSearch size={15} color={T.textMuted} stroke={1.75} />
      <input
        value={eventSearch}
        onChange={(e) => setEventSearch(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search events..."
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          background: "transparent",
          outline: "none",
          color: T.textPrimary,
          fontSize: 13,
          fontFamily: T.font,
        }}
      />
    </div>
  );
}

function SortDropdown() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sortOrder = useUiStore((s) => s.sortOrder);
  const setSortOrder = useUiStore((s) => s.setSortOrder);

  const active =
    MARKETS_SORT_OPTIONS.find((o) => o.value === sortOrder) ?? MARKETS_SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 36,
          padding: "0 14px",
          background: T.bgTertiary,
          border: `0.5px solid ${open ? T.borderHover : T.border}`,
          borderRadius: T.radiusPill,
          color: T.textPrimary,
          fontSize: 13,
          cursor: "pointer",
          fontFamily: T.font,
        }}
      >
        {active.display}
        <IconChevronDown size={14} color={T.textMuted} stroke={1.75} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 42,
            right: 0,
            minWidth: 160,
            background: T.bgTertiary,
            border: T.hairline(T.borderHover),
            borderRadius: T.radius,
            padding: 6,
            zIndex: 50,
            boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
          }}
        >
          {MARKETS_SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setSortOrder(option.value as SortOrder);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                border: "none",
                borderRadius: 6,
                background:
                  sortOrder === option.value ? T.bgSecondary : "transparent",
                color: sortOrder === option.value ? T.textPrimary : T.textSecondary,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              {option.display}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
