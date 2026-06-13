"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useUiStore } from "@/stores/uiStore";
import { useSubcategoriesForCategory } from "@/hooks/useMarkets";
import { T } from "@/lib/tokens";

const SIDEBAR_WIDTH = 200;

/**
 * Context-sensitive secondary navigation — appears only when the active
 * top-level category has subcategories in the live market data.
 */
export function MarketsSubcategorySidebar() {
  const activeCategory = useUiStore((s) => s.activeCategory);
  const subCategoryFilter = useUiStore((s) => s.subCategoryFilter);
  const setSubCategoryFilter = useUiStore((s) => s.setSubCategoryFilter);
  const subcategories = useSubcategoriesForCategory(activeCategory);

  const show = subcategories.length > 0;

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.aside
          key={activeCategory}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: SIDEBAR_WIDTH, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          style={{
            flexShrink: 0,
            overflow: "hidden",
            fontFamily: T.font,
            position: "sticky",
            top: 48,
            alignSelf: "flex-start",
            maxHeight: "calc(100vh - 48px)",
          }}
        >
          <nav
            style={{
              width: SIDEBAR_WIDTH,
              padding: "20px 0 32px",
              overflowY: "auto",
              maxHeight: "calc(100vh - 48px)",
            }}
          >
            <NavItem
              label="All markets"
              active={subCategoryFilter === "All Markets"}
              onClick={() => setSubCategoryFilter("All Markets")}
            />
            {subcategories.map((sub) => (
              <NavItem
                key={sub}
                label={sub}
                active={subCategoryFilter === sub}
                onClick={() => setSubCategoryFilter(sub)}
              />
            ))}
          </nav>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function NavItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "11px 20px",
        border: "none",
        borderLeft: active ? `2px solid ${T.green}` : "2px solid transparent",
        background: "transparent",
        color: active ? T.textPrimary : T.textSecondary,
        fontSize: 14,
        fontWeight: active ? 500 : 400,
        cursor: "pointer",
        fontFamily: T.font,
        transition: `color ${T.transition}, border-color ${T.transition}`,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = "#CCCCCC";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = T.textSecondary;
      }}
    >
      {label}
    </button>
  );
}
