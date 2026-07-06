# Gmail OAuth Setup Guide — From Scratch

This guide walks you through creating a Google Cloud project, enabling the Gmail API, and generating the OAuth credentials that Legal Mind needs. You only do this once.

---

## What You Will End Up With

Four environment variables to add to your `.env.local`:

```
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback
GMAIL_TOKEN_SECRET=...  (you generate this yourself — see Step 5)
```

---

## Step 1 — Create a Google Cloud Project

1. Open [https://console.cloud.google.com](https://console.cloud.google.com) and sign in with a **Google account you control** (a Gmail account is fine).
2. Click the project dropdown at the top left (it probably says "Select a project").
3. Click **"New Project"** in the top-right of the popup.
4. Name it: `Legal Mind` (or anything you like — it's internal).
5. Click **"Create"** and wait ~10 seconds for it to be provisioned.
6. Make sure the new project is selected in the top dropdown before continuing.

---

## Step 2 — Enable the Gmail API

1. In the left sidebar, go to **"APIs & Services" → "Library"**.
2. Search for **"Gmail API"**.
3. Click it, then click the blue **"Enable"** button.
4. Wait a few seconds. You'll be taken to the Gmail API overview page.

---

## Step 3 — Configure the OAuth Consent Screen

> [!IMPORTANT]
> This screen tells users what your app is called and what it will access. You must complete this before you can create credentials.

1. Go to **"APIs & Services" → "OAuth consent screen"**.
2. Select **"External"** (so any Google account can sign in — including test users).  
   *(We won't publish the app, so it stays in "Testing" mode — no Google verification needed.)*
3. Click **"Create"**.
4. Fill in the required fields:
   - **App name**: `Legal Mind`
   - **User support email**: your Gmail address
   - **Developer contact information**: your Gmail address
5. Click **"Save and Continue"**.
6. On the **Scopes** page, click **"Add or Remove Scopes"**.
7. In the search box, type `gmail.send`. Check the box for:
   - `https://www.googleapis.com/auth/gmail.send`
8. Search again for `gmail.readonly`. Check the box for:
   - `https://www.googleapis.com/auth/gmail.readonly`
9. Click **"Update"**, then **"Save and Continue"**.
10. On the **Test Users** page, click **"+ Add Users"**.
11. Add the Gmail addresses of every person who will test the app (including your own).
    > [!NOTE]
    > While the app is in "Testing" mode, only these listed addresses can complete the Gmail OAuth flow. You can add up to 100 test users without submitting for Google verification.
12. Click **"Save and Continue"**, then **"Back to Dashboard"**.

---

## Step 4 — Create OAuth 2.0 Credentials

1. Go to **"APIs & Services" → "Credentials"**.
2. Click **"+ Create Credentials"** → **"OAuth client ID"**.
3. For **Application type**, select **"Web application"**.
4. Name it: `Legal Mind Web Client`.
5. Under **"Authorized redirect URIs"**, click **"+ Add URI"** and add:
   ```
   http://localhost:3000/api/auth/gmail/callback
   ```
   When you deploy to production (e.g. Vercel), add your production URL too:
   ```
   https://your-app.vercel.app/api/auth/gmail/callback
   ```
6. Click **"Create"**.
7. A popup appears showing your credentials. **Copy and save both**:
   - **Client ID** → this is your `GMAIL_CLIENT_ID`
   - **Client Secret** → this is your `GMAIL_CLIENT_SECRET`

---

## Step 5 — Generate Your Encryption Secret

The Gmail refresh token is stored **encrypted** in your Supabase database (never plaintext). You need a 32-byte random key.

Run this once in any terminal (Node.js must be installed):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (it will look like a 64-character hex string). This is your `GMAIL_TOKEN_SECRET`.

> [!CAUTION]
> Never commit this value to Git. If you lose it, all stored tokens become unreadable and users will need to re-authorize.

---

## Step 6 — Add Everything to `.env.local`

Open `D:\PROJECTS\Applications\Legal Mind\my-part\ai&backend-hashir-hamza\.env.local` and add:

```env
# Gmail OAuth
GMAIL_CLIENT_ID=your-client-id-from-step-4.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret-from-step-4
GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback

# AES-256-GCM key for encrypting stored refresh tokens (from Step 5)
GMAIL_TOKEN_SECRET=your-64-char-hex-string-from-step-5
```

---

## Step 7 — Add the Supabase Column Migration

The encrypted refresh token is stored in the `profiles` table. Run this SQL in your **Supabase SQL Editor** (go to your Supabase project → SQL Editor → New Query):

```sql
-- Already in migration file, but run manually if migration hasn't been applied:
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gmail_refresh_token_enc text;
```

---

## How the Flow Works (for reference)

```
User (logged into Legal Mind via Supabase)
    │
    ▼  clicks "Connect Gmail"
GET /api/auth/gmail
    │  redirects to Google consent screen
    ▼
Google OAuth screen (user consents to gmail.send + gmail.readonly)
    │
    ▼  Google redirects back to:
GET /api/auth/gmail/callback?code=...&state=...
    │  exchanges code for refresh token
    │  encrypts refresh token with AES-256-GCM
    │  saves to profiles.gmail_refresh_token_enc
    ▼
User is now connected — Legal Mind can send/read Gmail on their behalf
```

---

## Step 8 — Supabase Google OAuth (for Login)

> [!NOTE]
> This is **separate** from the Gmail OAuth above. Supabase handles login. The Gmail OAuth above is just for sending/reading emails after the user is already logged in.

To enable Google login via Supabase:
1. Go to your Supabase project → **Authentication → Providers → Google**.
2. Enable it.
3. Paste in your Google Cloud **Client ID** and **Client Secret** (same ones from Step 4 work, OR create a separate OAuth client — recommended for production).
4. Copy the Supabase callback URL shown and add it to your Google Cloud credential's authorized redirect URIs (just like you did in Step 4).
5. Save.

---

## Checklist

- [ ] Google Cloud project created
- [ ] Gmail API enabled
- [ ] OAuth consent screen configured (External, Testing mode)
- [ ] Your email added as a test user
- [ ] OAuth client ID created (Web application type)
- [ ] Localhost redirect URI added
- [ ] `GMAIL_CLIENT_ID` saved to `.env.local`
- [ ] `GMAIL_CLIENT_SECRET` saved to `.env.local`
- [ ] `GMAIL_TOKEN_SECRET` generated and saved to `.env.local`
- [ ] Supabase column migration applied
- [ ] Supabase Google Auth provider enabled (for login)
