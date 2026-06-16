"use client";

import dynamic from "next/dynamic";
import { HeroChartSkeleton } from "@/components/dashboard/trending/HeroPriceChart";

export const HeroPriceChartLazy = dynamic(
  () =>
    import("@/components/dashboard/trending/HeroPriceChart").then(
      (m) => m.HeroPriceChart,
    ),
  {
    loading: () => <HeroChartSkeleton />,
    ssr: false,
  },
);
