# Supabase & Gemini Setup Guide

This document contains step-by-step instructions for configuring the Supabase database, enabling Google Auth, running the schema migrations, and setting up the Google Gemini API key.

---

## 1. Create a Supabase Project

1. Navigate to [Supabase](https://supabase.com) and sign in or create an account.
2. In the dashboard, click **New Project** and select your Organization.
3. Complete the project configuration:
   - **Name**: `Legal Mind`
   - **Database Password**: Choose a strong password and save it securely.
   - **Region**: Select a region close to your target audience (e.g., `Singapore` or `Mumbai` for Pakistan-based latency optimization).
   - **Pricing Plan**: Choose **Free** tier.
4. Click **Create new project** and wait for provisioning to finish (usually 1-2 minutes).

---

## 2. Retrieve Project URL & API Keys

Once the project is provisioned:
1. Navigate to **Project Settings** (gear icon in the bottom-left sidebar) -> **API**.
2. Under **Project API keys**, copy the following values and add them to your local `.env.local` or GitHub Repository Secrets:
   - **Project URL** (found under API URL): Maps to `NEXT_PUBLIC_SUPABASE_URL`
   - **`anon` public** key: Maps to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **`service_role` secret** key: Maps to `SUPABASE_SERVICE_ROLE_KEY`
     > [!WARNING]
     > The `service_role` key has admin access and bypasses Row Level Security (RLS). Never expose this key client-side or check it into Git.

---

## 3. Run Database Migrations

You can apply the schema migrations using either the Supabase Web Dashboard or the Supabase CLI.

### Option A: Via Supabase Dashboard (Easiest)
1. Go to the **SQL Editor** tab (SQL icon on the left sidebar).
2. Click **New Query** (or **Blank query**).
3. Open the migration file: [20260630000000_init_schema.sql](file:///c:/sem6/projects/legal-mind/supabase/migrations/20260630000000_init_schema.sql) in your code editor.
4. Copy the entire file content, paste it into the Supabase SQL Editor input, and click **Run** (bottom-right).
5. Ensure the console displays a success message.

### Option B: Via Supabase CLI (Local Development)
If you have Supabase CLI installed, link your project and apply:
```bash
supabase link --project-ref your-project-ref
supabase db push
```

---

## 4. Setup Google OAuth in Supabase Auth

To enable Google sign-in for users, you must register a Web Application on Google Cloud Console.

### Step A: Configure Google Cloud Console
1. Navigate to [Google Cloud Console](https://console.cloud.google.com).
2. Create a new project (e.g., `Legal Mind`).
3. Search for **APIs & Services** -> **OAuth consent screen**:
   - Choose **External** user type and click **Create**.
   - Input your App Name, User support email, and Developer contact information.
   - Click **Save and Continue** (skip Scopes and Test Users for now).
4. Navigate to **APIs & Services** -> **Credentials**:
   - Click **+ Create Credentials** at the top and select **OAuth client ID**.
   - **Application type**: Select `Web application`.
   - **Name**: `Legal Mind Client`.
   - Leave Authorized Origins and Redirect URIs empty for a moment.
   - Click **Create** and keep the popup open (showing your **Client ID** and **Client Secret**).

### Step B: Enable Google Provider in Supabase
1. Open your Supabase Dashboard and go to **Auth** -> **Providers** -> **Google**.
2. Toggle Google login to **Enabled**.
3. Under **Redirect URL**, copy the Callback URL provided by Supabase (it looks like `https://xxxx.supabase.co/auth/v1/callback`).
4. Switch back to your Google Cloud Console OAuth Client edit page.
5. Under **Authorized redirect URIs**, click **+ ADD URI** and paste the Supabase Callback URL.
6. Click **Save** on Google Cloud Console.
7. Copy the **Client ID** and **Client Secret** from Google Cloud Console.
8. Paste them into the corresponding fields in the Supabase Google Provider panel.
9. Click **Save** in Supabase.

---

## 5. Obtain Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com).
2. Sign in with your Google account.
3. Click the **Get API Key** button in the top left.
4. Click **Create API Key** and choose whether to create it in a new or existing Google Cloud project.
5. Copy the generated API key (starts with `AIzaSy...`).
6. Set this value as `GEMINI_API_KEY` in your `.env.local` or GitHub Repository Secrets.
