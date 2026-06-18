import type { Metadata } from "next";
import { Container, Card, PillBadge } from "@/components/ui";
import { FaqList } from "@/components/Faq";
import { HowItWorksSteps } from "@/components/how-it-works/HowItWorksSteps";
import { PayoutSpeedComparison } from "@/components/how-it-works/HowItWorksDemos";
import { FAQS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Choose a challenge, prove your edge on simulated Kalshi prices, and get funded with real capital.",
};

export default function HowItWorksPage() {
  return (
    <>
      <section className="border-b border-border py-16">
        <Container>
          <h1 className="sr-only">How it works</h1>
          <HowItWorksSteps />
        </Container>
      </section>

      <section className="border-y border-border bg-surface py-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <PillBadge tone="brand">Funded payouts</PillBadge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                Fast, transparent payouts
              </h2>
              <p className="mt-4 text-[13px] text-[#888888]">
                Every funded account pays out every 7 business days. Add the
                3-day add-on to go faster.
              </p>
              <PayoutSpeedComparison />
            </div>
            <Card className="self-center">
              <div className="divide-y divide-border">
                {[
                  ["Standard payout cycle", "7 business days"],
                  ["Fast payout add-on", "3 business days"],
                  ["Minimum payout", "2% of starting balance"],
                  ["Funded commission", "1% on opening transactions"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <span className="text-muted">{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Container>
      </section>

      <section id="faq" className="scroll-mt-20 py-16">
        <Container>
          <h2 className="text-3xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="mt-8">
            <FaqList items={FAQS} columns={2} />
          </div>
        </Container>
      </section>
    </>
  );
}
