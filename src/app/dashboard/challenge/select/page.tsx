import type { Metadata } from "next";
import { PricingCalculator } from "@/components/PricingCalculator";
import { ChallengeTierChart } from "@/components/ChallengeTierChart";
import { T } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "Select challenge",
  description: "Choose your evaluation tier and add-ons to start trading.",
};

export default function ChallengeSelectPage() {
  return (
    <div style={{ padding: "28px 32px 48px", fontFamily: T.font }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: T.textPrimary,
            letterSpacing: "-0.02em",
          }}
        >
          Build your challenge
        </h1>
        <p style={{ marginTop: 8, fontSize: 15, color: T.textMuted, maxWidth: 560 }}>
          Nine account sizes, five add-ons, and a live total. Pick a size, pay
          once, and start trading immediately.
        </p>

        <div style={{ marginTop: 32 }}>
          <PricingCalculator variant="dashboard" />
        </div>

        <div style={{ marginTop: 48 }}>
          <ChallengeTierChart variant="dashboard" />
        </div>
      </div>
    </div>
  );
}
