# Deploying Lenium to Vercel + connecting lenium.capital

This is a Next.js 16 app with **real authentication**, **Postgres (Supabase)**,
and a **live Kalshi market feed**. Production requires environment variables
below — the site will build without them, but signup, login, and billing will
not work until they are configured.

---

## Required environment variables (Vercel Production)

| Variable | Purpose |
|----------|---------|
| `AUTH_SECRET` | JWT session signing (`openssl rand -base64 32`) |
| `AUTH_URL` | **Required** — canonical site URL, e.g. `https://lenium.capital` (without this, signup/login sessions often fail even when `AUTH_SECRET` is set) |
| `POSTGRES_PRISMA_URL` | Supabase pooler URL (port 6543) |
| `POSTGRES_URL_NON_POOLING` | Supabase direct URL (port 5432) for migrations |
| `GOOGLE_CLIENT_ID` | **Required for Google sign-in** — without it, OAuth sends `client_id=undefined` and Google returns Error 401 |
| `GOOGLE_CLIENT_SECRET` | **Required for Google sign-in** (pair with `GOOGLE_CLIENT_ID`) |

**Optional:** `KALSHI_API_BASE`, `KALSHI_WS_TOKEN`, `TMDB_API_KEY`, `ADMIN_EMAILS`

Copy `.env.example` for the full list.

### Google OAuth redirect URIs

In Google Cloud Console, authorize:

- **JavaScript origins:** `https://lenium.capital`, `http://localhost:3000`
- **Redirect URIs:** `https://lenium.capital/api/auth/callback/google`

---

## Post-deploy verification

```bash
curl https://lenium.capital/api/health/db
# Expect: { "ok": true, "authSecretSet": true, "authUrlSet": true, "authFullyConfigured": true, "googleOAuthConfigured": true, "hasDbUrl": true }
```

Then manually verify:

1. Sign up with email → lands on dashboard
2. Google sign-in works
3. `/dashboard/markets` loads live markets (Trending tab)
4. Place and **close** a simulated trade on a market detail page
5. Pricing checkout creates a billing order when logged in

---

## Step 1 — Put the code in Git and push to GitHub

Run these in your own terminal from the project folder. Every push to `main`
triggers an automatic Vercel redeploy.

---

## Step 2 — Deploy on Vercel

1. Go to https://vercel.com and sign up / log in (use "Continue with GitHub").
2. Click **Add New… → Project**.
3. **Import** the repository.
4. Vercel auto-detects **Next.js** — leave build settings at defaults.
5. Add the **required environment variables** above before the first production
   deploy (or add them in Settings → Environment Variables and redeploy).
6. Click **Deploy**.

---

## Step 3 — Add your domain in Vercel

1. In the project, go to **Settings → Domains**.
2. Enter `lenium.capital` and click **Add**.
3. Also add `www.lenium.capital` (redirect `www` → apex recommended).
4. Add the DNS records Vercel displays (typically A `@` → `76.76.21.21` and
   CNAME `www` → `cname.vercel-dns.com`).

---

## Step 4 — DNS at Squarespace (Google Domains)

1. Sign in at https://account.squarespace.com → **Domains** → `lenium.capital`.
2. Open **DNS Settings** → **Custom records**.
3. Add the A and CNAME records from Vercel.
4. Remove conflicting parking records on `@` or `www`.

---

## Step 5 — Wait for verification

- Vercel → Settings → Domains flips to **Valid** once DNS propagates.
- SSL is provisioned automatically for `https://lenium.capital`.

---

## After it's live

- `metadataBase` is set to `https://lenium.capital` in `src/app/layout.tsx`.
- Payments use a **mock complete-payment flow** in Billing — wire a real
  payment processor before accepting live card charges.
- Kalshi market data uses the public API; set Kalshi credentials if you have
  a private feed.
