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
npm run seed:icons   # populate icon_mappings cache (after db push)
```

## Icon System

The dashboard uses a universal icon resolution pipeline so every outcome avatar
shows either a resolved image or a styled initials fallback.

### Admin endpoint

`GET/POST /api/icons/admin` — requires the signed-in user's email to appear in
`ADMIN_EMAILS` (comma-separated). Set in Vercel/production env, e.g.
`ADMIN_EMAILS=kyryl@lenium.capital`.

| Action | Method | Parameters |
| ------ | ------ | ---------- |
| List cache | `GET` | `?action=list&page=1&limit=50` |
| Invalidate category | `GET` | `?action=invalidate-all-category&category=Sports` |
| Add mapping | `POST` | `?action=add` with JSON body `{ name, category, image_url, source }` |

### Manually fix a missing icon

```bash
curl -X POST 'https://lenium.capital/api/icons/admin?action=add' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: <session>' \
  -d '{"name":"Entity Name","category":"Elections","image_url":"https://...","source":"manual"}'
```

### Re-run the seed

After `npx prisma db push`, insert pre-verified mappings (skips existing rows):

```bash
npm run seed:icons
```

Seed data lives in [`src/lib/icon-seed-data.ts`](src/lib/icon-seed-data.ts).

### Sports team logo URLs (ESPN CDN)

| League | URL pattern |
| ------ | ----------- |
| NFL | `https://a.espncdn.com/i/teamlogos/nfl/500/{abbr}.png` |
| NBA | `https://a.espncdn.com/i/teamlogos/nba/500/{abbr}.png` |
| MLB | `https://a.espncdn.com/i/teamlogos/mlb/500/{abbr}.png` |
| NHL | `https://a.espncdn.com/i/teamlogos/nhl/500/{abbr}.png` |
| Premier League | `https://a.espncdn.com/i/teamlogos/soccer/500/{id}.png` |

### TMDB (Culture category)

Register a free API key at [themoviedb.org](https://www.themoviedb.org/) and set
`TMDB_API_KEY` in the deployment environment. Culture outcomes try TMDB first,
then Wikipedia.

### Database setup (first deploy)

```bash
npx prisma db push
npm run seed:icons
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
  lib/pricing.ts   # tiers, add-ons, rules constants, FAQs, leaderboard + pricing helpers
```

All tier pricing, profit targets, drawdown/daily/position limits, add-on costs,
bundle discounts, reset fees, and the PropMarket comparison live in
[`src/lib/pricing.ts`](src/lib/pricing.ts) — edit there to update the whole site.

## Notes

- Estimated pass rates and PropMarket comparison figures are illustrative,
  grounded in the strategic brief and publicly cited industry data.
- The pricing calculator treats the 90% and 95% profit-split upgrades as
  mutually exclusive (an account has one split), and applies a bundle discount
  of 10–18% based on the number of add-ons selected.
