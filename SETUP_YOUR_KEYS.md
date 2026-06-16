# Fill in your keys here

Open this file and replace every `PASTE_YOUR_VALUE_HERE` with your real values.
When you're done, tell the agent to sync these into `.env.local`, or copy the block below into `.env.local` yourself.

---

## Google OAuth (from Google Cloud Console)

| Field | Your value |
|-------|------------|
| **GOOGLE_CLIENT_ID** | PASTE_YOUR_VALUE_HERE |
| **GOOGLE_CLIENT_SECRET** | PASTE_YOUR_VALUE_HERE |

**Google Console settings:**
- Authorized JavaScript origins: `https://lenium.capital` and `http://localhost:3000`
- Authorized redirect URIs:
  - `https://lenium.capital/api/auth/callback/google`
  - `http://localhost:3000/api/auth/callback/google`

---

## Auth (required for login to work)

| Field | Your value |
|-------|------------|
| **AUTH_SECRET** | PASTE_YOUR_VALUE_HERE (or keep the generated one below) |
| **AUTH_URL** (local dev) | `http://localhost:3000` |
| **AUTH_URL** (production) | `https://lenium.capital` |

Generate a new secret anytime with:
```bash
openssl rand -base64 32
```

---

## Database (if you have Supabase / Vercel — skip if already set on Vercel)

| Field | Your value |
|-------|------------|
| **POSTGRES_PRISMA_URL** | PASTE_YOUR_VALUE_HERE |
| **POSTGRES_URL_NON_POOLING** | PASTE_YOUR_VALUE_HERE |

---

## Copy-paste block for `.env.local`

Once filled in, your `.env.local` should look like this:

```env
# ─── Database ────────────────────────────────────────────────────────────────
POSTGRES_PRISMA_URL="PASTE_YOUR_VALUE_HERE"
POSTGRES_URL_NON_POOLING="PASTE_YOUR_VALUE_HERE"

# ─── Auth.js ─────────────────────────────────────────────────────────────────
AUTH_SECRET="PASTE_YOUR_VALUE_HERE"
AUTH_URL="http://localhost:3000"

# ─── Google OAuth ────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID="PASTE_YOUR_VALUE_HERE"
GOOGLE_CLIENT_SECRET="PASTE_YOUR_VALUE_HERE"

# ─── Optional ────────────────────────────────────────────────────────────────
ADMIN_EMAILS="kyryl@lenium.capital"
TMDB_API_KEY=""
```

---

## Vercel (production)

Add the same four auth variables under **Vercel → Project → Settings → Environment Variables** (Production):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `AUTH_SECRET` (same value as local, or a separate production secret)
- `AUTH_URL` = `https://lenium.capital`

Then redeploy.
