# Legal Mind — Full Build Plan & Antigravity Prompts (v2)

**Team:** Hashir & Hamza (Backend/AI/Agents) · Eman (Data & DB) · Lameea & Tooba (UI/UX & Frontend)
**Tool:** Google Antigravity (free for individuals, agent-first IDE/CLI, built on Gemini)
**Goal:** Zero-cost build + zero-cost hosting

**What changed from v1:** lawyers are no longer hand-typed into a CSV — Eman now builds a **crawler bot** that finds and refreshes lawyer data automatically. And the frontend skips Figma/Stitch entirely — you've picked a color palette, and Antigravity itself designs the full UI/UX around it.

---

## 0. Why this stack (unchanged from v1, still accurate)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router) + TypeScript + Tailwind**, single repo | One codebase = frontend + backend API routes. No separate backend server to host/pay for. |
| Hosting | **Vercel (Hobby/free plan)** | Free SSL, free `*.vercel.app` domain, free Cron Jobs (needed for the Monday email + Gmail reply checks). |
| Database + Auth + Vector store | **Supabase (Free plan)** | Free Postgres, built-in Google OAuth, free file storage, and **pgvector free on every plan** = our RAG store. ⚠️ Free projects auto-pause after 7 days idle — handled by a keep-alive GitHub Action. |
| LLM | **Gemini 2.5 Flash** (chat) + **Gemini text-embedding-004** (RAG embeddings) | Free, no credit card. `Gemini 2.5 Pro` is **no longer free** (cut in April 2026) — don't use it. |
| Backup LLM | **Groq free tier** (Llama 3.3) | Fallback if Gemini's daily quota is hit — keep the LLM call behind one function so swapping providers is a 1-line change. |
| Email agent | **Gmail API** (free) via the same Google OAuth + extra `gmail.send`/`gmail.readonly` scopes | Sends the lawyer message and checks for replies in the user's own Gmail. ⚠️ Needs Google's "test user" allowlist (not full verification) under 100 users — fine for your demo. |
| Lawyer data | **A crawler bot (built by Eman) instead of a manual list** | See Section 1 below — this is the main change in v2. |
| Design | **Antigravity decides the UI/UX itself**, constrained to your chosen color palette + your logo | No Figma/Stitch step — see Section 3. |
| Source control | **GitHub (free private repo)** | Same repo for everyone — this is what makes linear handoffs possible. |

---

## 1. Lawyer data — the crawler bot (Eman's main deliverable)

Manually typing in lawyers doesn't scale and goes stale immediately, so instead Eman builds an automated **crawler + enrichment pipeline** that finds lawyers, normalizes their info, and re-runs on a schedule to keep the dataset fresh.

**How it works, end to end:**
1. **Seed sources** — public lawyer directory sites that list name, city, specialization, and contact info openly (no login/paywall). Good candidates to start with: `pakistanlawyer.com/findlawyer`, `pk.pathlegal.com`, `solicitors.pk/legal-directory`. Avoid directories that paywall contact details (e.g. some require payment to "unlock" a phone number) — scraping around a paywall isn't something to build.
2. **Crawl** — a Node.js script using `cheerio` (for static HTML) or `playwright` (only if a site needs JS rendering) walks each directory's city/category listing pages and pulls: name, city, phone/WhatsApp, email (if listed), bio/specialization text, and the source URL.
3. **Respect the target sites** — check each site's `robots.txt` before crawling it, add a delay between requests (e.g. 1–2 seconds), set a descriptive User-Agent, and never crawl pages a site has told you not to.
4. **Enrich with Gemini** — many listings won't cleanly state "criminal lawyer" or give a reputation number. Feed the scraped bio text to Gemini and ask it to classify `specialization` (criminal/family/property/cyber/etc.) and estimate `experience_years` if mentioned. There is no real "reputation score" available from these sources — store a neutral default (e.g. `null`) rather than inventing one; only set it once you have a real signal (e.g. actual user feedback after lawyers are contacted through your app).
5. **Dedupe** — same lawyer often appears on multiple directories; dedupe by normalized name + city + phone number before inserting.
6. **Store with provenance** — every row records `source_url` and `last_crawled_at`, plus a `verified` boolean (default `false`). This matters because the app will be emailing/WhatsApp-ing real people automatically — scraped contact details can be outdated, so the team should spot-check a sample of entries before relying on outreach features in a demo, and the UI should be able to show a "details may be outdated" note for unverified entries.
7. **Re-run automatically** — schedule the crawler weekly via a free GitHub Actions workflow (not Vercel — serverless functions there time out too quickly for a crawl job). The job re-runs the pipeline and upserts new/changed lawyers.

This is entirely Eman's task in the prompt below — no manual CSV needed anymore.

---

## 2. The legal RAG dataset (unchanged from v1)

Download the official public-domain text of these from **pakistancode.gov.pk** and **na.gov.pk**, save into `/data/legal-docs/`:

1. The Constitution of Pakistan, 1973
2. Pakistan Penal Code (PPC), 1860
3. Code of Criminal Procedure (CrPC), 1898
4. Code of Civil Procedure (CPC), 1908
5. Qanun-e-Shahadat Order (Law of Evidence), 1984
6. Muslim Family Laws Ordinance, 1961
7. Dissolution of Muslim Marriages Act, 1939
8. Family Courts Act, 1964
9. Guardians and Wards Act, 1890
10. Prevention of Electronic Crimes Act (PECA), 2016
11. Protection of Women (Criminal Laws Amendment) Act, 2006
12. Relevant provincial domestic-violence act for your launch city (check the provincial assembly site)
13. Anti-Terrorism Act, 1997

Start with #1–#5 for the MVP.

---

## 3. Design phase — Antigravity designs it, not Figma

You've already chosen a color palette. Skip Figma/Stitch entirely. Lameea & Tooba give Antigravity the palette + the logo + the screen list, and let it make every layout/typography/spacing/component decision itself — that's built into their prompt in Section 6. This also means their work can start on Day 1 in parallel with everyone else, since it doesn't depend on the backend yet (it'll run against mock data first, then get wired to real APIs once Hashir & Hamza's API exists).

---

## 4. Execution order — who prompts Antigravity, and when

```
STAGE 1 (Day 1-3)
 ├─ Eman: Repo scaffold + Supabase schema + RAG ingestion + lawyer crawler bot   [BLOCKS Stage 2]
 └─ Lameea & Tooba (parallel): full UI/UX build with mock data — Antigravity-led design, no backend dependency

STAGE 2 (Day 4-6)
 └─ Hashir & Hamza: All backend logic (API routes), built on Eman's schema     [BLOCKS Stage 3]

STAGE 3 (Day 6-8)
 └─ Lameea & Tooba: Replace mock data calls with real calls to Hashir & Hamza's API endpoints

STAGE 4 (Day 8+)
 └─ Whole team: integration test, deploy to Vercel, done.
```

**Handoff rule:** after finishing a stage, that pair pushes to GitHub and writes a short `HANDOFF.md` note (what's done, what's not, what the next pair needs to know). The next pair's first Antigravity prompt should always be "pull the repo and read HANDOFF.md / SCHEMA.md / API.md before doing anything."

**"Singular unit" rule:** within each pair, only one person prompts at a time. When their Antigravity usage limit hits (resets every 5 hours on free tier), the teammate pulls the same repo and pastes the same master prompt, adding one line: *"This is a continuation. Pull latest from GitHub, read what's already built, and continue from there — do not restart from scratch."*

---

## 5. STAGE 1 — Eman's Antigravity Prompt

Run this first. Eman needs a free Supabase account and a free Google AI Studio Gemini API key created beforehand.

```
ROLE: You are setting up the foundational backend infrastructure AND the
lawyer-data pipeline for a Next.js app called "Legal Mind" — an AI legal
assistance app for Pakistan. You are the FIRST person to touch this
codebase. Everything you build is the contract every other teammate will
code against, so be thorough and document everything.

TECH STACK (use exactly this, no substitutions):
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (Postgres + Auth + Storage + pgvector) as the only database/auth provider
- Google Gemini API (free tier): text-embedding-004 for embeddings,
  gemini-2.5-flash for any text classification/enrichment needed by the crawler
- cheerio (+ playwright only if a target site truly requires JS rendering) for web scraping
- Package manager: npm
- Hosting target (don't deploy yet): Vercel for the app, GitHub Actions for scheduled jobs

TASK 1 — Scaffold the project:
Create a new Next.js 14 project named "legal-mind" with App Router,
TypeScript, Tailwind, ESLint. Initialize git. Folder structure:
/app
/lib (supabase client, gemini client, embedding utils)
/data/legal-docs (empty, for legal source PDFs)
/scripts (data ingestion + crawler scripts)
/supabase/migrations (SQL migration files)
/.github/workflows

TASK 2 — Supabase schema:
Write a SQL migration that enables the "vector" extension and creates:

- profiles (id uuid primary key references auth.users, full_name text,
  avatar_url text, city text, created_at timestamptz default now())
- cases (id uuid primary key default gen_random_uuid(), user_id uuid
  references auth.users, title text, case_type text, status text default
  'active' check (status in ('panic','active','lawyer_search','in_progress',
  'resolved')), created_at timestamptz default now(), updated_at timestamptz
  default now())
- messages (id uuid primary key default gen_random_uuid(), case_id uuid
  references cases(id) on delete cascade, role text check (role in
  ('user','assistant')), content text, created_at timestamptz default now())
- event_logs (id uuid primary key default gen_random_uuid(), case_id uuid
  references cases(id) on delete cascade, summary text, safe_to_share jsonb,
  do_not_share jsonb, created_at timestamptz default now())
- legal_documents (id uuid primary key default gen_random_uuid(), title text,
  law_category text, source_url text)
- legal_chunks (id uuid primary key default gen_random_uuid(), document_id
  uuid references legal_documents(id), content text, embedding vector(768),
  metadata jsonb)
- lawyers (id uuid primary key default gen_random_uuid(), name text, gender
  text, city text, specialization text[], experience_years int,
  reputation_score numeric, email text, whatsapp_number text, bio text,
  profile_image_url text, source_url text, last_crawled_at timestamptz,
  verified boolean default false, created_at timestamptz default now())
- case_lawyers (id uuid primary key default gen_random_uuid(), case_id uuid
  references cases(id), lawyer_id uuid references lawyers(id), status text
  default 'shortlisted' check (status in ('shortlisted','message_sent',
  'replied','suggested','selected')), message_sent text, contacted_at
  timestamptz, replied_at timestamptz, reply_summary text,
  reply_sentiment_score numeric)
- weekly_checkins (id uuid primary key default gen_random_uuid(), case_id
  uuid references cases(id), sent_at timestamptz default now())

Add Row Level Security so users only read/write their own rows. Create a
vector index (ivfflat or hnsw) on legal_chunks.embedding and a Postgres
function `match_legal_chunks(query_embedding vector(768), match_count int)`
returning the top N most similar chunks by cosine distance.

TASK 3 — RAG ingestion script:
Write /scripts/ingest-legal-docs.ts: reads every PDF/text file in
/data/legal-docs/, splits into ~500-token chunks with ~50-token overlap,
embeds each chunk via Gemini's text-embedding-004, inserts into
legal_documents + legal_chunks. Runnable via `npm run ingest-legal-docs`.
Test it against one short sample text file you create yourself; I'll add the
real law PDFs after.

TASK 4 — Lawyer crawler bot:
Write /scripts/crawl-lawyers.ts. It should:
a. Take a config list of seed directory URLs (start with:
   pakistanlawyer.com/findlawyer, pk.pathlegal.com, solicitors.pk/legal-directory
   — these list lawyer name/city/specialization/contact info openly).
b. Before crawling any site, fetch and respect its /robots.txt — skip any
   path that's disallowed.
c. For each allowed listing page, parse out: name, city, phone/WhatsApp
   number, email (if present), raw bio/specialization text, and the source
   page URL. Add a 1-2 second delay between requests to each domain and set
   a descriptive User-Agent header identifying this as a research/student
   project crawler.
d. For each scraped lawyer, call Gemini (gemini-2.5-flash) with their raw
   bio text and ask it to output strict JSON: { specialization: string[],
   estimated_experience_years: number|null }. Do NOT invent a
   reputation_score — leave it null unless we have a real signal later.
e. Deduplicate by normalized name + city + phone number before inserting
   (case-insensitive, trimmed).
f. Upsert into the lawyers table with source_url and last_crawled_at set,
   verified defaulting to false.
g. Log a summary at the end: how many lawyers found, how many new vs
   updated, any pages that failed to parse.
Make it runnable via `npm run crawl-lawyers`. Build it to run safely even if
a site's HTML structure is slightly different than expected (skip and log,
don't crash the whole run).

TASK 5 — Schedule the crawler:
Write /.github/workflows/crawl-lawyers.yml: a GitHub Actions workflow that
runs `npm run crawl-lawyers` once a week (free, no cost — GitHub Actions has
a free minutes quota for this). Document in /docs/CRAWLER.md how to add the
Supabase service role key and Gemini API key as GitHub repo secrets so the
workflow can write to the database.

TASK 6 — Auth + Supabase setup instructions:
Since you can't access browser dashboards, write /docs/SUPABASE_SETUP.md
with exact steps for me to: create the Supabase project, enable the Google
provider in Supabase Auth via a Google Cloud OAuth Client, run the migration
files, and retrieve the Supabase URL + anon key + service role key. Also
document getting a free Gemini API key from Google AI Studio. List every env
var needed in .env.example: NEXT_PUBLIC_SUPABASE_URL,
NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY.

TASK 7 — Keep the Supabase project alive:
Write /.github/workflows/keepalive.yml: runs every 3 days, makes a simple
authenticated request to the Supabase REST API so the free project never
hits the 7-day inactivity pause. Document adding the Supabase keys as repo
secrets.

TASK 8 — Documentation:
Write /docs/SCHEMA.md describing every table/column in plain English for the
next teammates. Write /HANDOFF.md: what's done, what env vars I need to
fill, that the crawler needs to actually be run once (and the legal PDFs
added) before the data is real, and that backend API work is next.

When finished, commit everything and tell me the exact commands to push to a
new GitHub repository named "legal-mind".
```

---

## 6. STAGE 1 (parallel) — Lameea & Tooba's First Antigravity Prompt (UI build, Antigravity-led design)

This can run from Day 1, independent of Eman. No Figma/Stitch needed — Antigravity designs the whole thing.

```
ROLE: You are the UI/UX designer AND frontend engineer for "Legal Mind" — an
AI legal-assistance app for Pakistan that helps people understand their legal
situation and connect with real lawyers. This is a sensitive-topic app
(people using it may be stressed or in crisis), so the design should feel
calm, trustworthy, and clear — not flashy, not corporate-cold either.

YOU ARE MAKING ALL DESIGN DECISIONS YOURSELF. There is no Figma file or
mockup to follow — I am NOT providing a fixed design spec. Use your own best
judgment for layout, spacing, typography, component shapes, iconography, and
micro-interactions. The only constraints are:
1. Primary color palette: [PASTE YOUR HEX CODES HERE]
2. Logo file: /public/logo-LM.png — use it in the header and login screen
3. The app must feel calming and trustworthy given the subject matter —
   avoid harsh reds/aggressive colors for primary actions, avoid anything
   that feels like a generic SaaS dashboard template.
Beyond that, design freely. If you think a different layout pattern (e.g.
sidebar vs bottom nav, card-based vs list-based) serves the app better than
what I might have assumed, use your judgment and explain your choice briefly
in a comment or in /docs/DESIGN_NOTES.md.

TECH STACK: Next.js 14 App Router, TypeScript, Tailwind CSS. This is a
STANDALONE frontend build for now — there is no backend yet, so use realistic
MOCK DATA (hardcoded arrays/objects in a /lib/mock-data.ts file) everywhere
a real API call will eventually go. Structure every data-fetching spot
clearly (e.g. a single function per screen like `getCases()`,
`searchLawyers(filters)`) so that swapping mock data for real API calls later
is a one-line change per function, not a rewrite.

BUILD THESE SCREENS:

1. Login screen — "Sign in with Google" button (visual only for now, just a
   button that calls a placeholder function), using the logo.
2. First-login disclaimer modal — "This AI can make mistakes and is not a
   substitute for a licensed lawyer," with an acknowledge button.
3. First-login city selector — dropdown/searchable list of major Pakistani
   cities, saved once.
4. App shell with navigation across these tabs: Main Chat, Cases, Lawyer
   Finder, plus a Script & Guidelines page and a Profile page. Use whatever
   nav pattern (sidebar/bottom bar/top tabs) you think fits best for mobile
   AND desktop.
5. Main Chat tab — sidebar/list of past cases (mock list), a chat window
   with user/assistant message bubbles, a text input, and a "Find a Lawyer
   for This Case" button that appears after a mock assistant response.
6. Cases tab — grid/list of case cards (title, case type badge, status
   badge, date) using mock data.
7. Lawyer Finder tab — a filter bar (case type, experience, reputation,
   city, and a gender filter defaulting to "Any" with Male/Female/Any
   options) and a results grid of lawyer "ID cards" (name, specialization
   tags, experience, reputation stars, photo placeholder, and three buttons:
   Email / WhatsApp / Call) using mock lawyer data. Include a "Generate
   Message" flow: a button that reveals an editable textarea with a mock
   drafted message and a "Save & Use This Message" button. Include a
   "Suggested Lawyers" section showing two highlighted lawyer cards with a
   short "why we suggest this lawyer" reasoning text (mock).
8. Script & Guidelines page — static content: calm, clear guidance on what's
   generally fine to share with a lawyer early on vs what to hold back until
   you've formally engaged them (don't overshare exact ID numbers, full home
   address, or financial details before confirming who you're speaking to).
9. Profile page — avatar upload UI (just the upload control, storage wiring
   comes later), display name, editable city, sign-out button.

REQUIREMENTS:
- Mobile-first, then make it work well on desktop too.
- Every screen needs loading states (skeletons) and empty states (e.g. "no
  cases yet, start a new chat") even though it's currently mock data —
  structure it so a real loading state slots in easily later.
- Use Tailwind only, no other UI library, so the whole team can read the
  styling without learning a new system.
- Write /docs/DESIGN_NOTES.md explaining the layout/navigation choices you
  made and why, plus the exact hex values you used throughout (derived from
  the palette I gave you) — this is so the team understands the design
  system you created.
- Write /HANDOFF.md noting: this is a UI-only build on mock data, every
  screen and its corresponding mock-data function is listed, and once the
  backend team's API.md exists, the next step is swapping mock functions for
  real fetches (no UI redesign needed if done right).

Commit and push to a new branch on the shared GitHub repo (pull the latest
first if Eman has already pushed anything), then tell me the command to open
a pull request.
```

---

## 7. STAGE 2 — Hashir & Hamza's Antigravity Prompt

Run this only after Eman's repo is pushed with real Supabase credentials and the crawler has been run at least once so real lawyer rows exist.

```
ROLE: You are the backend/AI engineer for "Legal Mind". The repo already has
a Next.js scaffold, a Supabase schema, a RAG ingestion pipeline, and a
lawyer crawler built by a teammate, plus a frontend UI built on mock data by
another teammate. FIRST: read /docs/SCHEMA.md, /docs/CRAWLER.md, and every
HANDOFF.md in the repo before writing any code. Do not change the existing
schema unless something is genuinely broken — explain why first if so.

TECH STACK (match what's already in the repo):
- Next.js 14 App Router API routes (/app/api/) for all backend logic
- Supabase JS client (already in /lib) for DB + Auth
- Gemini: gemini-2.5-flash for chat/classification/generation,
  text-embedding-004 for RAG queries (same model the ingestion script used)
- Gmail API (googleapis npm package) for sending/reading lawyer emails
- Vercel Cron Jobs (vercel.json) for scheduled tasks

TASK 1 — Auth + Gmail OAuth scopes:
Extend the existing Supabase Google OAuth login to also request incremental
Gmail scopes (gmail.send, gmail.readonly) so the app can send/read email on
the user's behalf. Store the returned refresh token securely (encrypted
column or a restricted table, never plaintext in a publicly-readable table).
Write /docs/GMAIL_SETUP.md with setup steps in Google Cloud Console
(consent screen, enabling Gmail API, adding test users to avoid the >100
user verification requirement).

TASK 2 — Main chat endpoint: POST /app/api/chat/route.ts
Input: { caseId (nullable), message }.
1. If caseId is null, create a new case row.
2. Save the user's message to `messages`.
3. Call Gemini to classify: is this an actual legal case, or panic/venting
   with no real legal issue? Strict JSON output:
   { "is_case": boolean, "case_type": string|null, "reasoning": string }.
4. If is_case is false: respond with ONLY a comforting, calming message, no
   "Find Lawyer" option, set case status to 'panic'.
5. If is_case is true:
   a. Embed the message via text-embedding-004.
   b. Call `match_legal_chunks` to retrieve the top 5 relevant legal chunks.
   c. Build a RAG prompt for Gemini: act as a calm, knowledgeable legal
      guide for Pakistan, grounded ONLY in the retrieved excerpts, never
      inventing citations. Generate a clear, reassuring response.
   d. Generate an event_log JSON: safe_to_share vs do_not_share info (never
      share full CNIC numbers, exact home address, or anything not legally
      necessary at first contact).
   e. Save assistant message, save event_log, set case_type, status 'active'.
   f. Return the response plus `showFindLawyerCTA: true`.

TASK 3 — Cases endpoints:
GET /app/api/cases/route.ts — list user's cases (id, title, case_type,
status, created_at), newest first.
GET /app/api/cases/[id]/route.ts — one case with full message history and
event_logs.

TASK 4 — Lawyer search: POST /app/api/lawyers/search/route.ts
Input: { caseId, city, caseType, gender (default "any"), minExperience
(optional), minReputation (optional) }. Query the lawyers table with these
filters. Since some lawyers come from the crawler and may be unverified,
order by verified desc, then reputation_score desc nulls last, then
experience_years desc. Return top 10, including the verified flag so the
frontend can show an "unverified — details may be outdated" note where
relevant.

TASK 5 — Generate outreach message: POST /app/api/lawyers/generate-message/route.ts
Input: { caseId }. Pull that case's event_logs safe_to_share fields ONLY
(never do_not_share). Use Gemini to draft a professional message to a
lawyer explaining the issue and asking them to take the case. Return the
draft for the user to edit before saving.

TASK 6 — Save + contact lawyer: POST /app/api/lawyers/contact/route.ts
Input: { caseId, lawyerId, finalMessage, channel: "email"|"whatsapp"|"call" }.
Save finalMessage, upsert case_lawyers with status 'message_sent' and
contacted_at = now(). If channel is "email", send finalMessage via Gmail
using the stored refresh token. If "whatsapp"/"call", just return the data
needed — the client opens wa.me/tel: links itself. Update the event_log
noting which lawyer was contacted and how.

TASK 7 — Daily Gmail reply-check (cron): /app/api/cron/check-replies/route.ts
For every case_lawyers row with status 'message_sent' and contacted_at
within the last 2 days, check that user's Gmail for a reply from that
lawyer's email. If found: set status 'replied', replied_at, store
reply_summary. Once at least 2 lawyers on a case have replied, use Gemini to
rank replies by empathy, clarity, and stated experience; mark the top 2 as
'suggested' with a short reasoning string. Send the user a notification
email via Gmail. Secure this route so only the Vercel Cron job can trigger
it (check a secret header).

TASK 8 — Final lawyer selection: POST /app/api/lawyers/select/route.ts
Input: { caseId, lawyerId }. Set that case_lawyers row to 'selected', close
out the others for that case, update the event_log, set case status to
'in_progress'.

TASK 9 — Weekly Monday check-in (cron): /app/api/cron/weekly-checkin/route.ts
For every case with status 'active' or 'in_progress', send a Gmail email
asking for an update, lightly personalized via Gemini using the case title.

TASK 10 — vercel.json cron config:
Add two cron entries: check-replies daily, weekly-checkin every Monday.

TASK 11 — Documentation:
Write /docs/API.md listing every endpoint, input/output shape, and which UI
action calls it. Update /HANDOFF.md: what's done, new env vars added, and
that frontend should now swap mock data for these real endpoints.

Commit and push to a new branch, then tell me the command to open a pull
request into main.
```

---

## 8. STAGE 3 — Lameea & Tooba's Second Antigravity Prompt (wire to real backend)

Run this once Hashir & Hamza's branch is merged.

```
ROLE: You previously built the full UI for "Legal Mind" using mock data. The
backend team has now built real API routes, documented in /docs/API.md.
FIRST: pull the latest repo and read /docs/API.md and /HANDOFF.md fully.

YOUR TASK: Go through every screen you built and replace each mock-data
function (e.g. getCases(), searchLawyers()) with a real fetch call to the
matching endpoint in API.md. Do not change the visual design — only the data
layer. Specifically:
- Wire login to real Supabase Google OAuth (remove the placeholder button
  handler).
- Wire the disclaimer + city selector to actually save to the profiles table
  on first login only.
- Wire Main Chat to POST /api/chat and GET /api/cases / GET /api/cases/[id].
  When the API returns showFindLawyerCTA: true, show the "Find a Lawyer"
  button exactly as before, now driven by the real flag.
- Wire Cases tab to GET /api/cases.
- Wire Lawyer Finder's filters to POST /api/lawyers/search. If a returned
  lawyer has verified: false, show a small "unverified — details may be
  outdated" note on their card. Wire "Generate Message" to
  POST /api/lawyers/generate-message and "Save" to storing it. Wire the
  Email/WhatsApp/Call buttons to POST /api/lawyers/contact (for email) and
  real wa.me/tel: links (for WhatsApp/call) using the saved message and the
  lawyer's real phone/email from the API response. Wire the "Suggested
  Lawyers" section and "Proceed with this lawyer" button to the real
  suggested-lawyers data and POST /api/lawyers/select.
- Wire Profile's avatar upload to Supabase Storage, saving the URL to
  profiles.avatar_url.
- Add proper loading states and error states (e.g. a toast/banner) for every
  real API call now that real network failures are possible.

Once everything works locally (npm run dev) against the real backend,
prepare for deployment: confirm vercel.json doesn't conflict with anything,
list every environment variable needed (pull the full list from
.env.example across the repo) and write /docs/DEPLOY.md with exact steps to
connect this GitHub repo to a new Vercel project, add the env vars, and
deploy. Don't deploy yourself — list the steps for me, since that needs
dashboard access.

Commit and push to a new branch, then tell me the command to open a pull
request into main.
```

---

## 9. After Stage 3: going live (whole team, ~30 minutes)

1. Merge all branches into `main`.
2. vercel.com → New Project → import the GitHub repo (free, no card).
3. Paste every env var from `.env.example` into Vercel's project settings.
4. Deploy → free `legal-mind-yourteam.vercel.app` URL, $0/month.
5. In Google Cloud Console, add the live Vercel URL as an authorized redirect URI for both the Supabase Auth client and the Gmail OAuth scopes.
6. Test the full flow end-to-end with your team's own Gmail accounts added as OAuth test users.
7. Manually trigger `npm run crawl-lawyers` once (or wait for the first scheduled GitHub Actions run) so the Lawyer Finder tab has real data before your demo.

## 10. Things to watch as you grow past the demo stage

- Gemini free tier is rate-limited (~10 requests/minute) — fine for a few testers, will need a paid key or the Groq fallback for real users.
- Crawled lawyer data quality varies — spot-check a sample before relying on it for outreach in a live demo, and keep the `verified` flag visible in the UI.
- Supabase free tier caps at 500MB DB storage and pauses after 7 days idle (handled by the keep-alive workflow).
- Gmail's sensitive scopes need Google's verification once you pass 100 real users — free but slower, not a blocker today.
