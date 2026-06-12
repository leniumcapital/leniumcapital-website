import type { Metadata } from "next";
import { auth } from "@/auth";
import { Container, Card } from "@/components/ui";
import { usd } from "@/lib/data";

export const metadata: Metadata = { title: "Platform" };

export default async function PlatformPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) return null;

  return (
    <section className="py-12">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Trading platform
            </h1>
            <p className="mt-2 text-muted">
              Live Kalshi markets on your {usd(user.tier)}{" "}
              {user.accountType === "funded" ? "funded" : "challenge"} account.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold tabular-nums">
            <span className="size-1.5 rounded-full bg-brand" />
            {usd(user.balance)}
          </span>
        </div>

        <Card className="mt-8 flex min-h-64 items-center justify-center text-center">
          <div>
            <p className="text-lg font-semibold">Trading terminal coming online</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Live order entry on Kalshi markets runs through Lenium&apos;s
              secure server-side API — your account credentials are never
              exposed to the browser.
            </p>
          </div>
        </Card>
      </Container>
    </section>
  );
}
