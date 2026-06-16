"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { IconChevronRight, IconTriangleFilled } from "@tabler/icons-react";
import type { CompactListItem } from "@/lib/trendingLayout";
import { T } from "@/lib/tokens";

function CompactMarketListInner({
  title,
  items,
  onHeaderClick,
}: {
  title: string;
  items: CompactListItem[];
  onHeaderClick?: () => void;
}) {
  const router = useRouter();

  if (items.length === 0) return null;

  return (
    <section style={{ marginBottom: 24, fontFamily: T.font }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: 10,
        }}
      >
        <button
          type="button"
          onClick={onHeaderClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            padding: 0,
            cursor: onHeaderClick ? "pointer" : "default",
            color: T.textPrimary,
            fontSize: 15,
            fontWeight: 500,
            fontFamily: T.font,
          }}
        >
          {title}
        </button>
        <IconChevronRight size={14} color={T.textMuted} stroke={1.5} />
      </div>

      {items.map((item, i) => (
        <div
          key={item.eventTicker}
          role="button"
          tabIndex={0}
          onClick={() =>
            router.push(`/dashboard/markets/${encodeURIComponent(item.leaderTicker)}`)
          }
          onKeyDown={(e) =>
            e.key === "Enter" &&
            router.push(`/dashboard/markets/${encodeURIComponent(item.leaderTicker)}`)
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            height: 52,
            borderBottom: i < items.length - 1 ? T.hairline() : "none",
            cursor: "pointer",
            transition: `background 100ms ease`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span
            style={{
              color: T.textMuted,
              fontSize: 13,
              minWidth: 16,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {item.rank}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              title={item.title}
              style={{
                color: T.textPrimary,
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.title}
            </div>
            <div
              style={{
                color: T.textMuted,
                fontSize: 11,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginTop: 2,
              }}
            >
              {item.subtitle}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ color: T.textPrimary, fontSize: 13, fontWeight: 600 }}>
              {item.probability}%
            </div>
            {item.change !== undefined && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 3,
                  marginTop: 2,
                }}
              >
                <IconTriangleFilled
                  size={10}
                  style={{
                    color: item.change >= 0 ? T.green : T.red,
                    transform: item.change >= 0 ? "none" : "rotate(180deg)",
                  }}
                />
                <span
                  style={{
                    color: item.change >= 0 ? T.green : T.red,
                    fontSize: 11,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {item.change >= 0 ? "+" : ""}
                  {item.change.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

export const CompactMarketList = memo(CompactMarketListInner);
