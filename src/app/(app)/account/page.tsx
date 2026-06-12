import type { Metadata } from "next";
import { auth } from "@/auth";
import { Container, Card } from "@/components/ui";
import { usd } from "@/lib/data";
import { challengeStatusLabel } from "@/lib/users";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) return null;

  const rows: [string, string][] = [
    ["Name", user.name ?? "—"],
    ["Email", user.email ?? "—"],
    ["Account type", user.accountType === "funded" ? "Funded" : "Challenge"],
    ["Account size", usd(user.tier)],
    ["Status", challengeStatusLabel(user.challengeStatus)],
  ];

  return (
    <section className="py-12">
      <Container className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
        <p className="mt-2 text-muted">Your profile and account details.</p>

        <Card className="mt-8 p-0">
          <dl className="divide-y divide-border">
            {rows.map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between px-6 py-4 text-sm"
              >
                <dt className="text-muted">{label}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </Container>
    </section>
  );
}
