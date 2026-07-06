# LegalMind — Deployment Guide

This guide covers deploying the **backend + API** (`ai&backend-hashir-hamza`) to Vercel.
The frontend (Lameea & Tooba's Vite app) is deployed separately — see step 6.

---

## Prerequisites

Before you deploy, confirm these are all done:
- [ ] You have access to the shared GitHub repository with `main` branch up to date
- [ ] Supabase project is live (not paused) at `https://vildpqbwrrzxscqlerym.supabase.co`
- [ ] Gmail OAuth credentials exist in Google Cloud Console (see `docs/GMAIL_SETUP.md`)
- [ ] Gemini API key is working (already confirmed)

---

## Step 1 — Push the backend to GitHub

Open a terminal in `d:\LegalMind\ai&backend-hashir-hamza` and run:

```bash
git add .
git commit -m "Stage 3 complete: all API routes wired and tested"
git push origin main
```

> If `main` is protected and you're on a feature branch, open a Pull Request and merge it first.

---

## Step 2 — Create the Vercel Project (Backend)

1. Go to **[vercel.com](https://vercel.com)** → Sign in with your GitHub account
2. Click **"Add New Project"**
3. Under **"Import Git Repository"** find your repo (`legal-mind` or whatever it's named) and click **Import**
4. On the **Configure Project** screen:
   - **Framework Preset:** `Next.js` ← Vercel detects this automatically
   - **Root Directory:** click **Edit** → type `ai&backend-hashir-hamza` (the subfolder that has `package.json`)
   - **Build Command:** leave as default (`next build`)
   - **Output Directory:** leave as default (`.next`)
5. **Do NOT click Deploy yet** — add env vars first (Step 3)

---

## Step 3 — Add Environment Variables (Backend)

Still on the Configure Project screen, scroll down to **Environment Variables**.
Add each one exactly as shown below (copy the values from your `.env.local`):

| Variable Name | Value to paste |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vildpqbwrrzxscqlerym.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(your anon key from `.env.local` line 3)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(your service role key from `.env.local` line 4)* |
| `GEMINI_API_KEY` | *(your Gemini key from `.env.local` line 8)* |
| `GMAIL_CLIENT_ID` | *(from `.env.local` line 12)* |
| `GMAIL_CLIENT_SECRET` | *(from `.env.local` line 13)* |
| `GMAIL_REDIRECT_URI` | **CHANGE THIS** → `https://YOUR-VERCEL-URL.vercel.app/api/auth/gmail/callback` |
| `GMAIL_TOKEN_SECRET` | *(from `.env.local` line 17 — the 64-char hex string)* |
| `CRON_SECRET` | *(from `.env.local` line 20)* |
| `NEXT_PUBLIC_APP_URL` | **CHANGE THIS** → `https://YOUR-VERCEL-URL.vercel.app` |

> ⚠️ You won't know your Vercel URL until after first deploy. Deploy once, copy the URL, then update `GMAIL_REDIRECT_URI` and `NEXT_PUBLIC_APP_URL` under **Settings → Environment Variables** and redeploy.

Now click **Deploy**.

---

## Step 4 — Update Google Cloud Console (after you have the Vercel URL)

Once Vercel gives you your live URL (e.g. `https://legal-mind-hamza.vercel.app`):

1. Go to **[console.cloud.google.com](https://console.cloud.google.com)**
2. Navigate to **APIs & Services → Credentials**
3. Click your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs** → click **Add URI** → paste:
   ```
   https://YOUR-VERCEL-URL.vercel.app/api/auth/gmail/callback
   ```
5. Under **Authorized JavaScript origins** → add:
   ```
   https://YOUR-VERCEL-URL.vercel.app
   ```
6. Click **Save**

Also update Supabase:
1. Go to **[supabase.com](https://supabase.com)** → your project → **Authentication → URL Configuration**
2. Under **Redirect URLs** add:
   ```
   https://YOUR-VERCEL-URL.vercel.app/**
   ```
3. Click **Save**

---

## Step 5 — Verify Cron Jobs are Active

The `vercel.json` already configures two cron jobs:

| Cron | Schedule | What it does |
|---|---|---|
| `GET /api/cron/check-replies` | Daily at 3:00 AM UTC | Checks Gmail for lawyer replies |
| `GET /api/cron/weekly-checkin` | Every Monday 7:00 AM UTC | Sends case update emails |

To confirm they're registered:
1. In Vercel dashboard → your project → **Settings → Cron Jobs**
2. You should see both jobs listed — if not, check that `vercel.json` is at the root of the deployed directory

---

## Step 6 — Deploy the Frontend (Vite App)

The frontend (`Legal-Mind-frontend-lameea-tooba/New folder`) is a **separate Vite project** and needs its own Vercel deployment.

1. Go to **vercel.com** → **Add New Project** again
2. Same repo, but this time set **Root Directory** to `Legal-Mind-frontend-lameea-tooba/New folder`
3. **Framework Preset:** `Vite`
4. Add these environment variables:

| Variable Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://vildpqbwrrzxscqlerym.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(same anon key as above)* |

5. Click **Deploy**
6. After deployment, copy the frontend URL (e.g. `https://legal-mind-frontend.vercel.app`)
7. Go back to the **backend** Vercel project → **Settings → Environment Variables** → update `NEXT_PUBLIC_APP_URL` to the frontend URL if they differ

> The frontend calls the backend at `/api/...` — since they are on different origins you may need to set `VITE_BACKEND_URL=https://YOUR-BACKEND-URL.vercel.app` in the frontend env and update fetch calls accordingly. If both are deployed to the same Vercel project this is not needed.

---

## Step 7 — Run the Lawyer Crawler (Once, Before Demo)

The `lawyers` table is currently empty. Before your demo, run the crawler manually:

```bash
# In your terminal (local machine), inside the backend folder:
cd "d:\LegalMind\ai&backend-hashir-hamza"
npm run crawl-lawyers
```

This will scrape public lawyer directories and populate the `lawyers` table in Supabase.
The GitHub Actions weekly schedule will keep it fresh after that.

---

## Step 8 — End-to-End Test Checklist

Do this with your team after deployment:

- [ ] Open the frontend URL in a browser — landing page loads
- [ ] Click **Sign in with Google** — OAuth completes, you land on the disclaimer
- [ ] Acknowledge disclaimer → city selector appears → pick a city → enter app
- [ ] Go to **Main Chat** → type a legal question → AI responds with citations
- [ ] Go to **Cases** tab → your new case appears
- [ ] Go to **Lawyer Finder** → select a city + case type → click Search → lawyers appear
- [ ] Click **Generate Draft Message** → AI draft appears
- [ ] Go to **Profile** → change your display name → click Save → reload page → name persisted
- [ ] Check Vercel logs for any 500 errors (Vercel dashboard → your project → **Deployments → Functions**)

---

## Environment Variables — Quick Reference

### Backend (`ai&backend-hashir-hamza`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-side only) |
| `GEMINI_API_KEY` | ✅ | Google AI Studio API key |
| `GMAIL_CLIENT_ID` | ✅ | Google Cloud OAuth client ID |
| `GMAIL_CLIENT_SECRET` | ✅ | Google Cloud OAuth client secret |
| `GMAIL_REDIRECT_URI` | ✅ | Must match the URI registered in Google Cloud |
| `GMAIL_TOKEN_SECRET` | ✅ | 64-char hex key for encrypting refresh tokens |
| `CRON_SECRET` | ✅ | Arbitrary secret to protect cron endpoints |
| `NEXT_PUBLIC_APP_URL` | ✅ | Live URL of the deployed app |

### Frontend (`Legal-Mind-frontend-lameea-tooba`)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Same Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Same Supabase anon key |

---

## Troubleshooting

**"Unauthorized" errors on all API calls**
→ Check that `NEXT_PUBLIC_SUPABASE_ANON_KEY` matches exactly what's in Supabase Dashboard → Settings → API

**Gmail OAuth redirect fails**
→ `GMAIL_REDIRECT_URI` in Vercel env vars must exactly match the URI listed in Google Cloud Console — including `https://` and no trailing slash

**Cron jobs not firing**
→ Vercel Cron Jobs require the **Hobby plan or above** — they are free but you must be on a named plan, not a legacy free plan

**Supabase project is paused**
→ Log into supabase.com and click "Restore project". The GitHub Actions keep-alive workflow prevents this during normal operation.

**Lawyer Finder shows 0 results**
→ The `lawyers` table is empty. Run `npm run crawl-lawyers` locally (Step 7) before the demo.
