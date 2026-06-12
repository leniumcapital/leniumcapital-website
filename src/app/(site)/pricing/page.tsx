import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Container } from "@/components/ui";
import { PricingCalculator } from "@/components/PricingCalculator";
import { ChallengeTierChart } from "@/components/ChallengeTierChart";
import { CHALLENGE_SELECT_PATH } from "@/lib/callback-url";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Nine evaluation tiers from $5,000 to $100,000. Choose a size, pay a one-time fee, hit your profit goal, and get funded.",
};

export default async function PricingPage() {
  const session = await auth();
  if (session?.user) {
    redirect(CHALLENGE_SELECT_PATH);
  }

  return (
    <>
      <section className="border-b border-border py-14">
        <Container>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Build your challenge
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Nine account sizes, five add-ons, and a live total. Pick a size, pay
            once, and see exactly what it takes to get funded.
          </p>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <PricingCalculator variant="public" />
        </Container>
      </section>

      <ChallengeTierChart variant="public" />
    </>
  );
}
