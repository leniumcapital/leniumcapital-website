import { TIERS, usd, resetLineShort } from "@/lib/data";
import { T } from "@/lib/tokens";

type ChallengeTierChartProps = {
  variant?: "public" | "dashboard";
};

const STEPS = [
  {
    n: "1",
    title: "Pick an account size",
    body: "Choose how much capital you want to trade with, from $5,000 up to $100,000.",
  },
  {
    n: "2",
    title: "Pay a one-time fee",
    body: "A single upfront fee for that account. No subscriptions, no hidden charges.",
  },
  {
    n: "3",
    title: "Hit your profit goal",
    body: "Reach the profit goal without crossing the safety limit, then trade our money and keep the profits.",
  },
];

export function ChallengeTierChart({ variant = "public" }: ChallengeTierChartProps) {
  const isDashboard = variant === "dashboard";

  if (isDashboard) {
    return (
      <div style={{ fontFamily: T.font }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: T.textPrimary,
            letterSpacing: "-0.02em",
          }}
        >
          Every account, explained simply
        </h2>
        <p style={{ marginTop: 10, maxWidth: 560, fontSize: 14, color: T.textMuted }}>
          Three steps. Choose a size, pay a one-time fee, and earn your profit goal
          without crossing the safety limit.
        </p>

        <div
          style={{
            marginTop: 24,
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          {STEPS.map((s) => (
            <div
              key={s.n}
              style={{
                borderRadius: 12,
                border: T.hairline(),
                background: T.bgTertiary,
                padding: 16,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: T.green,
                  color: T.bgPrimary,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {s.n}
              </div>
              <h3
                style={{
                  marginTop: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.textPrimary,
                }}
              >
                {s.title}
              </h3>
              <p style={{ marginTop: 4, fontSize: 13, color: T.textMuted }}>{s.body}</p>
            </div>
          ))}
        </div>

        <TierTable dashboard />
      </div>
    );
  }

  return (
    <section className="border-y border-border bg-surface py-14">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <h2 className="text-3xl font-semibold tracking-tight">
          Every account, explained simply
        </h2>
        <p className="mt-3 max-w-2xl text-muted">
          Three steps. Choose a size, pay a one-time fee, and earn your profit
          goal without crossing the safety limit. That&apos;s it.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-border bg-background p-5"
            >
              <div className="grid size-8 place-items-center rounded-full bg-brand text-sm font-bold text-[#04130b]">
                {s.n}
              </div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>

        <TierTable />
      </div>
    </section>
  );
}

function TierTable({ dashboard }: { dashboard?: boolean }) {
  const table = (
    <div
      className={dashboard ? undefined : "mt-8 overflow-hidden rounded-2xl border border-border bg-background"}
      style={
        dashboard
          ? {
              marginTop: 24,
              overflow: "hidden",
              borderRadius: 12,
              border: T.hairline(),
              background: T.bgTertiary,
            }
          : undefined
      }
    >
      <div
        className={
          dashboard
            ? undefined
            : "hidden bg-surface-muted px-5 py-3 md:grid md:grid-cols-4 md:gap-4"
        }
        style={
          dashboard
            ? {
                display: "none",
                background: T.bgSecondary,
                padding: "10px 16px",
              }
            : undefined
        }
      >
        <ColHead title="Account size" hint="What you trade with" dashboard={dashboard} />
        <ColHead title="One-time fee" hint="What you pay" dashboard={dashboard} />
        <ColHead title="Profit goal" hint="Earn this to get funded" dashboard={dashboard} />
        <ColHead title="Safety limit" hint="Don't lose more than this" dashboard={dashboard} />
      </div>

      <div className={dashboard ? undefined : "divide-y divide-border"}>
        {TIERS.map((t, i) => {
          const goal = Math.round((t.size * t.profitTargetPct) / 100);
          const loss = Math.round((t.size * t.maxDrawdownPct) / 100);
          return (
            <div
              key={t.size}
              className={
                dashboard
                  ? undefined
                  : "grid grid-cols-2 gap-4 px-5 py-4 md:grid-cols-4 md:items-center"
              }
              style={
                dashboard
                  ? {
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 16,
                      padding: "14px 16px",
                      borderTop: i > 0 ? T.hairline() : "none",
                    }
                  : undefined
              }
            >
              <Field label="Account size" dashboard={dashboard}>
                <span
                  className={
                    dashboard
                      ? undefined
                      : "inline-flex rounded-lg bg-brand-soft px-2.5 py-1 text-base font-semibold text-foreground"
                  }
                  style={
                    dashboard
                      ? {
                          display: "inline-flex",
                          borderRadius: 8,
                          background: T.greenMutedBg,
                          padding: "4px 10px",
                          fontSize: 14,
                          fontWeight: 600,
                          color: T.textPrimary,
                        }
                      : undefined
                  }
                >
                  {usd(t.size)}
                </span>
              </Field>

              <Field label="One-time fee" dashboard={dashboard}>
                <div
                  className={dashboard ? undefined : "text-base font-semibold"}
                  style={
                    dashboard
                      ? { fontSize: 14, fontWeight: 600, color: T.textPrimary }
                      : undefined
                  }
                >
                  ${t.baseFee}
                </div>
                <div
                  className={dashboard ? undefined : "text-xs text-muted"}
                  style={
                    dashboard ? { fontSize: 11, color: T.textMuted, marginTop: 2 } : undefined
                  }
                >
                  paid once · {resetLineShort(t)}
                </div>
              </Field>

              <Field label="Profit goal" dashboard={dashboard}>
                <div
                  className={dashboard ? undefined : "text-base font-semibold text-brand-strong"}
                  style={
                    dashboard
                      ? { fontSize: 14, fontWeight: 600, color: T.green }
                      : undefined
                  }
                >
                  ${goal.toLocaleString()}
                </div>
              </Field>

              <Field label="Safety limit" dashboard={dashboard}>
                <div
                  className={dashboard ? undefined : "text-base font-semibold"}
                  style={
                    dashboard
                      ? { fontSize: 14, fontWeight: 600, color: T.textPrimary }
                      : undefined
                  }
                >
                  ${loss.toLocaleString()}
                </div>
              </Field>
            </div>
          );
        })}
      </div>
    </div>
  );

  return table;
}

function ColHead({
  title,
  hint,
  dashboard,
}: {
  title: string;
  hint: string;
  dashboard?: boolean;
}) {
  return (
    <div>
      <div
        className={dashboard ? undefined : "text-sm font-semibold"}
        style={dashboard ? { fontSize: 12, fontWeight: 600, color: T.textPrimary } : undefined}
      >
        {title}
      </div>
      <div
        className={dashboard ? undefined : "text-xs text-muted"}
        style={dashboard ? { fontSize: 11, color: T.textMuted } : undefined}
      >
        {hint}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  dashboard,
}: {
  label: string;
  children: React.ReactNode;
  dashboard?: boolean;
}) {
  return (
    <div>
      <div
        className={
          dashboard
            ? undefined
            : "text-[11px] font-medium uppercase tracking-wide text-muted md:hidden"
        }
        style={
          dashboard
            ? {
                fontSize: 10,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: T.textMuted,
              }
            : undefined
        }
      >
        {label}
      </div>
      <div className={dashboard ? undefined : "mt-1 md:mt-0"} style={dashboard ? { marginTop: 4 } : undefined}>
        {children}
      </div>
    </div>
  );
}
