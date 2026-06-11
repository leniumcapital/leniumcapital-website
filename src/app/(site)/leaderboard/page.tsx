import type { Metadata } from "next";
import { Container, PillBadge } from "@/components/ui";
import { LEADERBOARD, usd } from "@/lib/data";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "The top funded Lenium traders by profit, earnings, and streak. Funded and live.",
};

export default function LeaderboardPage() {
  const podium = LEADERBOARD.slice(0, 3);

  return (
    <>
      <section className="border-b border-border py-14">
        <Container>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Funded and live
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Real traders, real capital, real USD payouts. Updated daily. Opt in
            during onboarding to appear here.
          </p>
        </Container>
      </section>

      {/* Podium */}
      <section className="py-12">
        <Container>
          <div className="grid gap-4 md:grid-cols-3">
            {podium.map((p) => (
              <div
                key={p.username}
                className="rounded-2xl border border-border bg-surface p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-brand">
                    #{p.rank}
                  </span>
                  {p.funded && (
                    <PillBadge tone="brand">Currently funded</PillBadge>
                  )}
                </div>
                <div className="mt-3 font-semibold">@{p.username}</div>
                <div className="text-sm text-muted">
                  {usd(p.tier)} account
                </div>
                <div className="mt-4 text-3xl font-semibold tracking-tight text-brand-strong">
                  +{p.profitPct}%
                </div>
                <div className="mt-1 text-sm text-muted">
                  {usd(p.earnings)} earned · {p.streak}-day streak
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Full table */}
      <section className="pb-16">
        <Container>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-5 py-3 font-medium">Rank</th>
                  <th className="px-5 py-3 font-medium">Trader</th>
                  <th className="px-5 py-3 font-medium">Account</th>
                  <th className="px-5 py-3 font-medium">Profit</th>
                  <th className="px-5 py-3 font-medium">Earnings</th>
                  <th className="px-5 py-3 font-medium">Streak</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {LEADERBOARD.map((e) => (
                  <tr key={e.username}>
                    <td className="px-5 py-3 font-mono text-muted">
                      {e.rank}
                    </td>
                    <td className="px-5 py-3 font-medium">@{e.username}</td>
                    <td className="px-5 py-3 text-muted">{usd(e.tier)}</td>
                    <td className="px-5 py-3 font-semibold text-brand-strong">
                      +{e.profitPct}%
                    </td>
                    <td className="px-5 py-3">{usd(e.earnings)}</td>
                    <td className="px-5 py-3 text-muted">{e.streak}d</td>
                    <td className="px-5 py-3">
                      {e.funded ? (
                        <span className="inline-flex items-center gap-1.5 text-brand-strong">
                          <span className="size-2 rounded-full bg-brand" />
                          Funded
                        </span>
                      ) : (
                        <span className="text-muted">In challenge</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>
    </>
  );
}
