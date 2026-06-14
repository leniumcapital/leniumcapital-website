import type { Metadata } from "next";
import { Suspense } from "react";
import { ChallengeSelector } from "@/components/ChallengeSelector";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Nine evaluation tiers from $5,000 to $100,000. Pick a size, configure add-ons, and see exactly what you pay before you commit.",
};

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <ChallengeSelector />
    </Suspense>
  );
}
