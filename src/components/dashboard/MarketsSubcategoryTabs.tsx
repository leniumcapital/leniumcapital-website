"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useUiStore } from "@/stores/uiStore";
import {
  useSubcategoriesForCategory,
  categoryHasSubcategorySidebar,
} from "@/hooks/useMarkets";
import { T } from "@/lib/tokens";

/**
 * Horizontal subcategory tabs — shown below the section heading when the
 * active primary category has subcategories (President, Senate, Basketball, …).
 */
export function MarketsSubcategoryTabs() {
  const activeCategory = useUiStore((s) => s.activeCategory);
  const subCategoryFilter = useUiStore((s) => s.subCategoryFilter);
  const setSubCategoryFilter = useUiStore((s) => s.setSubCategoryFilter);
  const subcategories = useSubcategoriesForCategory(activeCategory);

  const show =
    categoryHasSubcategorySidebar(activeCategory) || subcategories.length > 0;

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{ overflow: "hidden" }}
        >
          <div
            className="lenium-tabbar"
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 20,
              padding: "0 24px",
              marginBottom: 8,
              overflowX: "auto",
              borderBottom: T.hairline(),
              fontFamily: T.font,
            }}
          >
            <SubTab
              label="All markets"
              active={subCategoryFilter === "All Markets"}
              onClick={() => setSubCategoryFilter("All Markets")}
            />
            {subcategories.map((sub) => (
              <SubTab
                key={sub}
                label={sub}
                active={subCategoryFilter === sub}
                onClick={() => setSubCategoryFilter(sub)}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SubTab({
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
        position: "relative",
        display: "flex",
        alignItems: "center",
        height: 40,
        padding: 0,
        border: "none",
        background: "transparent",
        color: active ? T.textPrimary : "#888888",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "color 120ms ease",
        fontFamily: T.font,
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = "#CCCCCC";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = active ? T.textPrimary : "#888888";
      }}
    >
      {label}
      {active && (
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 2,
            background: T.green,
            borderRadius: 1,
          }}
        />
      )}
    </button>
  );
}
