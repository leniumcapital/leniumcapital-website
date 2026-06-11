# Lenium

Marketing site for **Lenium** — the first CFTC-regulated prediction market
proprietary trading firm, built on Kalshi. Funds skilled traders to trade
event contracts after they pass a structured evaluation challenge.

Live domain target: **lenium.capital**

## Stack

- [Next.js 16](https://nextjs.org) (App Router, server-side rendered)
- React 19 + TypeScript
- Tailwind CSS v4 (with light/dark theme)
- All data is mock/static for this launch site (no live Kalshi/Stripe yet)

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

## Pages

| Route            | Description                                                        |
| ---------------- | ------------------------------------------------------------------ |
| `/`              | Hero, Kalshi-vs-Polymarket positioning, 3-step teaser, tier grid   |
| `/how-it-works`  | 3-step flow with UI mockups, early-withdrawal fees, FAQ accordion  |
| `/pricing`       | Live challenge calculator + add-ons + full PropMarket comparison   |
| `/rules`         | Tier-filtered rules table, plain-English explanations, 4 PM rules  |
| `/leaderboard`   | Funded-trader podium + full leaderboard table                      |
| `/login`         | Account login form (UI only)                                       |

## Project structure

```
src/
  app/            # routes (App Router) + layout + global styles
  components/      # Nav, Footer, Logo, ThemeToggle, calculators, FAQ, UI primitives
  lib/data.ts      # tiers, add-ons, rules, FAQs, leaderboard + pricing helpers
```

All tier pricing, profit targets, drawdown/daily/position limits, add-on costs,
bundle discounts, reset fees, and the PropMarket comparison live in
[`src/lib/data.ts`](src/lib/data.ts) — edit there to update the whole site.

## Notes

- Estimated pass rates and PropMarket comparison figures are illustrative,
  grounded in the strategic brief and publicly cited industry data.
- The pricing calculator treats the 90% and 95% profit-split upgrades as
  mutually exclusive (an account has one split), and applies a bundle discount
  of 10–18% based on the number of add-ons selected.
