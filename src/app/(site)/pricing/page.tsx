import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Container, PillBadge } from "@/components/ui";
import { ChallengeSelector } from "@/components/ChallengeSelector";
import { CHALLENGE_SELECT_PATH } from "@/lib/callback-url";
import { buildPricingQuery, parseAddonsParam, parseTierParam } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Six evaluation tiers from $5,000 to $100,000. Pick a size, configure add-ons, and see exactly what you pay before you commit.",
};

type PageProps = {
  searchParams: Promise<{ tier?: string; addons?: string }>;
};

export default async function PricingPage({ searchParams }: PageProps) {
  const session = await auth();
  if (session?.user) {
    const params = await searchParams;
    const tier = parseTierParam(params.tier ?? null);
    const addons = parseAddonsParam(params.addons ?? null);
    const query = buildPricingQuery(tier.size, addons);
    redirect(`${CHALLENGE_SELECT_PATH}?${query}`);
  }

  return (
    <>
      <section className="border-b border-border py-14">
        <Container>
          <PillBadge tone="brand">Build your challenge</PillBadge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Choose your account size
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Pick a tier, add optional upgrades, and see your total before you
            commit. One-time fee — no subscriptions.
          </p>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <Suspense fallback={null}>
            <ChallengeSelector isAuthenticated={Boolean(session?.user)} />
          </Suspense>
        </Container>
      </section>
    </>
  );
}
