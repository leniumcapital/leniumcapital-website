# Deploying Lenium to Vercel + connecting lenium.capital

This is a Next.js 16 app. It needs **no environment variables** to run — the
Kalshi market feed uses a public endpoint and falls back to bundled mock data
if that endpoint is unreachable. (Optional: set `KALSHI_API_BASE` to override
the Kalshi API base URL.)

---

## Step 1 — Put the code in Git and push to GitHub

Run these in your own terminal from the project folder
(`~/Projects/lenium`). The in-IDE sandbox can't create a `.git` folder, so do
this locally:

```bash
cd ~/Projects/lenium
git init -b main
git add -A
git commit -m "Initial commit: Lenium marketing site"
```

Create an empty repo on GitHub (github.com → New repository → name it
`lenium`, leave it empty — no README/.gitignore), then:

```bash
git remote add origin https://github.com/<your-username>/lenium.git
git push -u origin main
```

---

## Step 2 — Deploy on Vercel

1. Go to https://vercel.com and sign up / log in (use "Continue with GitHub").
2. Click **Add New… → Project**.
3. **Import** the `lenium` repository.
4. Vercel auto-detects **Next.js** — leave all build settings at their
   defaults (Build command `next build`, output handled automatically).
5. Click **Deploy**. In ~1 minute you'll get a live URL like
   `https://lenium-xxxx.vercel.app`. Confirm the site looks right there first.

Every future `git push` to `main` will redeploy automatically.

---

## Step 3 — Add your domain in Vercel

1. In the project, go to **Settings → Domains**.
2. Enter `lenium.capital` and click **Add**.
3. Also add `www.lenium.capital` (Vercel will offer to redirect one to the
   other — recommended: redirect `www` → apex, or vice-versa, your choice).
4. Vercel will now show you the exact DNS records to create. They are
   normally:

   | Type  | Name / Host | Value                  |
   |-------|-------------|------------------------|
   | A     | `@`         | `76.76.21.21`          |
   | CNAME | `www`       | `cname.vercel-dns.com` |

   **Use whatever values Vercel displays** — they are authoritative and can
   change. The table above is the typical case.

---

## Step 4 — Add the DNS records at Squarespace (Google Domains)

Your domain is managed by **Squarespace Domains** (Google Domains migrated
there).

1. Sign in at https://account.squarespace.com → **Domains** → click
   `lenium.capital`.
2. Open **DNS** / **DNS Settings** → **Custom records** (or "Manage custom
   records").
3. Add the records Vercel gave you:
   - **A record** — Host: `@`, Value: `76.76.21.21`
   - **CNAME record** — Host: `www`, Value: `cname.vercel-dns.com`
4. If Squarespace added any default parking records that conflict on `@` or
   `www`, remove those so only the Vercel records remain.
5. Save.

> Tip: Squarespace also has a "Connect to a third party" wizard. The manual
> A + CNAME records above are the most reliable path for Vercel.

---

## Step 5 — Wait for verification

- Back in **Vercel → Settings → Domains**, the domain will flip from
  "Invalid Configuration" to **Valid** once DNS propagates (usually minutes,
  up to a couple hours).
- Vercel auto-provisions a free SSL certificate, so `https://lenium.capital`
  works automatically.

---

## After it's live

- `metadataBase` is already set to `https://lenium.capital` in
  `src/app/layout.tsx`, so SEO/OG tags resolve correctly.
- To make changes: edit code → `git push` → Vercel redeploys.
- Auth (Google/Apple sign-in) and payments are still mock UI — wire up a real
  auth provider + payment processor before taking live signups.
