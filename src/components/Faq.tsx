"use client";

import { useState } from "react";
import type { FAQ } from "@/lib/pricing";

function FaqColumn({
  items,
  open,
  setOpen,
  offset,
}: {
  items: FAQ[];
  open: number | null;
  setOpen: (i: number | null) => void;
  offset: number;
}) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {items.map((item, i) => {
        const index = offset + i;
        const isOpen = open === index;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-medium">{item.q}</span>
              <svg
                className={`size-4 shrink-0 text-muted transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {isOpen && (
              <p className="px-5 pb-5 text-sm leading-relaxed text-muted">
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FaqList({
  items,
  columns = 1,
}: {
  items: FAQ[];
  columns?: 1 | 2;
}) {
  const [open, setOpen] = useState<number | null>(0);

  if (columns === 2) {
    const mid = Math.ceil(items.length / 2);
    const left = items.slice(0, mid);
    const right = items.slice(mid);
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <FaqColumn items={left} open={open} setOpen={setOpen} offset={0} />
        <FaqColumn items={right} open={open} setOpen={setOpen} offset={mid} />
      </div>
    );
  }

  return (
    <FaqColumn items={items} open={open} setOpen={setOpen} offset={0} />
  );
}
