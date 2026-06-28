# Legal Mind — Full Build Plan & Antigravity Prompts

**Team:** Hashir & Hamza (Backend/AI/Agents) · Eman (Data & DB) · Lameea & Tooba (UI/UX & Frontend)
**Tool:** Google Antigravity (free for individuals, agent-first IDE/CLI, built on Gemini)
**Goal:** Zero-cost build + zero-cost hosting

---

## 0. Why this stack (read this before anyone opens Antigravity)

Free-tier limits change often, so here's exactly what's true right now (June 2026) and why each piece was picked:

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router) + TypeScript + Tailwind**, single repo | One codebase = frontend pages AND backend API routes. No separate backend server to host/pay for. This is the single biggest decision that keeps cost at $0. |
| Hosting | **Vercel (Hobby/free plan)** | Built for Next.js, free SSL, free `*.vercel.app` domain, and supports **Cron Jobs** on the free plan (we need these for the Monday email + Gmail reply checks). |
| Database + Auth + Vector store | **Supabase (Free plan)** | One free Postgres DB, built-in **Google OAuth** login, free file storage (for pfp + logo), and **pgvector is free on every plan** — this is our RAG vector store, no separate vector DB needed. ⚠️ Caveat: free Supabase projects auto-pause after 7 days idle — we fix this with a scheduled GitHub Actions ping (included in Eman's prompt). |
| LLM | **Gemini 2.5 Flash** (chat) + **Gemini text-embedding-004** (RAG embeddings), via Google AI Studio API key | Free, no credit card. As of mid-2026 free tier ≈ 10 RPM / 250 RPD on Flash — fine for a student/demo-scale app. `Gemini 2.5 Pro` is **no longer free** (Google cut it in April 2026), so don't use it. |
| Backup LLM | **Groq free tier** (Llama 3.3) | Keep as a fallback in code in case Gemini's daily quota is hit — switching providers later is a 1-line env var change if you structure the LLM call behind one function. |
| Email agent | **Gmail API** (free) via the same Google OAuth, with extra `gmail.send` + `gmail.readonly` scopes | Lets the app send the lawyer message and check for replies in the user's own Gmail. ⚠️ Caveat: Google requires "app verification" for these sensitive scopes only if you go past 100 users — for your demo, just add your team + test users' Gmail addresses as "test users" in the Google Cloud OAuth consent screen and it works immediately, free. |
| Design | **Figma** (free) or **Google Stitch** (free, Google AI Studio's text/image → UI tool) | Either works. Recommended path below. |
| Source control | **GitHub (free private repo)** | Everyone works off the same repo — this is what makes "linear" handoffs possible. |

Nothing here costs money at your scale. The only thing that can quietly break this is the Supabase 7-day pause and Gmail OAuth verification — both are handled below.

---

## 1. The dataset Eman needs to collect (for the RAG legal corpus)

Download the **official, public-domain text** of these from **pakistancode.gov.pk** (Ministry of Law & Justice's official portal) and **na.gov.pk** (National Assembly), save as PDFs/text in `/data/legal-docs/`:

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
12. Provincial domestic-violence acts relevant to your launch city (e.g., Punjab Protection of Women Against Violence Act, 2016 — check the relevant provincial assembly site for other provinces)
13. Anti-Terrorism Act, 1997 (covers serious criminal classification)

Start with #1–#5 for the MVP; add the rest once chat + lawyer finder work end-to-end.

**Lawyer directory dataset:** there's no free public API for verified Pakistani lawyers with ratings, so this has to be manually compiled by Eman into a CSV (`lawyers.csv`) with columns: `name, gender, city, specialization, experience_years, reputation_score(1-5, your own estimate from public reviews/Google listings), email, whatsapp_number, bio, source`. Start with ~10–15 lawyers per city you're launching in (e.g., Rawalpindi/Islamabad first) — enough to demo filters and the "top 10" shortlist.

---

## 2. Execution order — who prompts Antigravity, and when

This is the part that prevents chaos. **Work happens in 3 linear stages, with one parallel track:**

```
STAGE 1 (Day 1-2)
 ├─ Eman: Repo scaffold + Supabase schema + RAG ingestion + lawyer CSV import   [BLOCKS Stage 2]
 └─ Lameea & Tooba (parallel, doesn't block on Eman): Figma/Stitch design only — no code yet

STAGE 2 (Day 3-5)
 └─ Hashir & Hamza: All backend logic (API routes), built on Eman's schema     [BLOCKS Stage 3]

STAGE 3 (Day 5-7)
 └─ Lameea & Tooba: Convert design → real Next.js code, wire to Hashir/Hamza's APIs

STAGE 4 (Day 7+)
 └─ Whole team: integration test together, deploy to Vercel, done.
```

**Why this order:** the database schema is the contract everyone else codes against, so it must exist first. Backend logic needs that schema. Frontend needs working API endpoints to call, not just a design. Design itself needs nothing from anyone, so it runs in parallel from day one — don't let Lameea & Tooba sit idle waiting.

**Handoff rule:** after finishing their stage, that pair pushes to GitHub `main` and writes a short `HANDOFF.md` note ("here's what's done, here's what you need to know, here's what's NOT done yet"). The next pair's very first Antigravity prompt should be "pull the repo and read HANDOFF.md + SCHEMA.md/API.md before doing anything."

**"Singular unit" rule (your request):** within each pair, only one person prompts at a time. When that person's Antigravity usage limit hits (free tier resets every 5 hours), the teammate opens the **same repo** (git pull first) on their own Antigravity and pastes the **same master prompt** below, adding one line at the top: *"This is a continuation. Pull latest from GitHub, read what's already built, and continue from there — do not restart from scratch."* That's literally the only difference.

---

## 3. Design phase (Lameea & Tooba — do this BEFORE touching Antigravity)

1. **Pick the tool:** Figma gives more manual control; Google Stitch (in Google AI Studio, free) generates UI screens from text prompts and is faster for a first draft. Recommended: start in **Stitch** to get a fast first draft of all screens, then pull it into **Figma** to refine colors/spacing and lock the design system, since Figma exports are cleaner for handoff.
2. Design these screens (you choose the color theme — pick something that feels trustworthy/calm, since this is for people in legal stress; avoid harsh reds):
   - Login screen (Google sign-in button) → Disclaimer modal ("AI can make mistakes, this is not a substitute for a real lawyer") → City selector (Pakistan cities dropdown)
   - Main Chat tab (sidebar of past cases like Claude/ChatGPT, chat window, "Find Lawyer" button that appears after AI response)
   - Cases tab (list of case cards: title, type, status, date)
   - Lawyer Finder tab (filter bar: case type, experience, reputation, gender, city; 10 lawyer "ID cards" with photo, name, specialization, contact buttons; "Suggested Lawyers" section with the AI's top-2 + reasoning; "Generate Message" screen with editable text box)
   - Script & Guidelines screen (what to say / not say on a phone call with a lawyer)
   - Profile screen (avatar upload, name, city)
   - Use `logo-LM.png` (your existing logo) in the header/login screen.
3. Export: PNG screenshots of every screen + your chosen hex color palette + font choice. You'll attach these images directly into the Antigravity prompt in Stage 3 so the agent matches your design instead of inventing its own.

---

## 4. STAGE 1 — Eman's Antigravity Prompt

Run this first, before anyone else touches Antigravity. Eman needs a free Supabase account and a free Google AI Studio API key (for Gemini) created beforehand — Antigravity will ask for these as env vars, it can't create cloud accounts for you.

```
ROLE: You are setting up the foundational backend infrastructure for a Next.js app
called "Legal Mind" — an AI legal-assistance app for Pakistan. You are the FIRST
person to touch this codebase. Everything you build here is the contract every
other teammate will code against, so be thorough and document everything.

TECH STACK (use exactly this, no substitutions):
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (Postgres + Auth + Storage + pgvector) as the only database/auth provider
- Google Gemini API (free tier) for embeddings — model: text-embedding-004 (768 dimensions)
- Package manager: npm
- Hosting target (don't deploy yet, just structure for it): Vercel

TASK 1 — Scaffold the project:
Create a new Next.js 14 project named "legal-mind" with App Router, TypeScript,
Tailwind, and ESLint. Initialize a git repo. Set up this folder structure:
/app
/lib (supabase client, gemini client, embedding utils)
/data/legal-docs (empty, for legal source PDFs)
/data/lawyers.csv (placeholder)
/scripts (data ingestion scripts)
/supabase/migrations (SQL migration files)

TASK 2 — Supabase schema:
Write a SQL migration file that creates these tables in Supabase (enable the
"vector" extension first):

- profiles (id uuid primary key references auth.users, full_name text,
  avatar_url text, city text, created_at timestamptz default now())
- cases (id uuid primary key default gen_random_uuid(), user_id uuid references
  auth.users, title text, case_type text, status text default 'active'
  check (status in ('panic','active','lawyer_search','in_progress','resolved')),
  created_at timestamptz default now(), updated_at timestamptz default now())
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
  profile_image_url text, source text)
- case_lawyers (id uuid primary key default gen_random_uuid(), case_id uuid
  references cases(id), lawyer_id uuid references lawyers(id), status text
  default 'shortlisted' check (status in ('shortlisted','message_sent',
  'replied','suggested','selected')), message_sent text, contacted_at
  timestamptz, replied_at timestamptz, reply_summary text,
  reply_sentiment_score numeric)
- weekly_checkins (id uuid primary key default gen_random_uuid(), case_id
  uuid references cases(id), sent_at timestamptz default now())

Add Row Level Security (RLS) policies so users can only read/write their own
rows (match on auth.uid() = user_id, joined through case_id where needed).
Create an index on legal_chunks.embedding using pgvector's ivfflat or hnsw
index for similarity search, and a Postgres function `match_legal_chunks(query_embedding vector(768), match_count int)`
that returns the top N most similar chunks by cosine distance — this is what
the backend team will call for RAG.

TASK 3 — RAG ingestion script:
Write a Node.js script (/scripts/ingest-legal-docs.ts) that:
1. Reads every PDF/text file in /data/legal-docs/
2. Splits each into ~500-token chunks with ~50-token overlap
3. Calls the Gemini embedding API (text-embedding-004) for each chunk
4. Inserts the document into legal_documents and each chunk + embedding into
   legal_chunks
Make it runnable via `npm run ingest-legal-docs`. I will manually download
the actual law PDFs into /data/legal-docs/ myself — just build the pipeline,
test it with one short sample text file you create.

TASK 4 — Lawyer data seed script:
Write a script (/scripts/seed-lawyers.ts) that reads /data/lawyers.csv and
bulk-inserts into the lawyers table. I will fill in the real CSV myself —
just build the importer and validate it against a sample CSV with 3 fake rows.

TASK 5 — Auth setup instructions:
Since you can't access browser dashboards, write a clear step-by-step guide
in /docs/SUPABASE_SETUP.md for me to follow manually to: (a) create the
Supabase project, (b) enable the Google provider in Supabase Auth using a
Google Cloud OAuth Client ID/Secret, (c) run the migration files, (d) get the
Supabase URL + anon key + service role key, (e) get a free Gemini API key
from Google AI Studio. List every exact env var name needed in a `.env.example`
file: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY.

TASK 6 — Keep the Supabase project alive:
Supabase free projects pause after 7 days with zero requests. Write a GitHub
Actions workflow (/.github/workflows/keepalive.yml) that runs on a schedule
(every 3 days) and makes a simple authenticated request to the Supabase REST
API to keep it active. Document how to add the Supabase keys as GitHub repo
secrets.

TASK 7 — Documentation for the team:
Write /docs/SCHEMA.md describing every table, every column, and what it's
for, in plain English, for the backend and frontend teammates who will read
it next. Write /HANDOFF.md summarizing: what's done, what env vars I need to
fill in, and that the next step is "Hashir & Hamza build the backend API
routes on top of this schema."

When finished, initialize the repo, commit everything, and tell me the exact
git commands to push it to a new GitHub repository named "legal-mind".
```

---

## 5. STAGE 2 — Hashir & Hamza's Antigravity Prompt

Run this only after Eman's repo is pushed to GitHub and the Supabase project is live with real credentials in `.env`.

```
ROLE: You are the backend/AI engineer for "Legal Mind". The repo already has
a Next.js scaffold, a Supabase schema, and a RAG ingestion pipeline built by
a teammate. FIRST: read /docs/SCHEMA.md and /HANDOFF.md in this repo fully
before writing any code. Do not change the existing schema unless something
is genuinely broken — if so, explain why before touching it.

TECH STACK (match what's already in the repo):
- Next.js 14 App Router API routes (in /app/api/) for all backend logic
- Supabase JS client (already configured in /lib) for DB + Auth
- Google Gemini API: gemini-2.5-flash for chat/classification/generation,
  text-embedding-004 for RAG queries (same model the ingestion script used)
- Gmail API (googleapis npm package) for sending and reading lawyer emails
- Vercel Cron Jobs (via vercel.json) for scheduled tasks

TASK 1 — Auth + Gmail OAuth scopes:
Extend the existing Supabase Google OAuth login to also request incremental
Gmail scopes (https://www.googleapis.com/auth/gmail.send and
https://www.googleapis.com/auth/gmail.readonly) so the app can send/read
email on the user's behalf later. Store the returned refresh token securely
(use Supabase's encrypted columns or a separate restricted-access table, not
plaintext in a public table). Write clear setup instructions in
/docs/GMAIL_SETUP.md for configuring this in Google Cloud Console (OAuth
consent screen, enabling the Gmail API, adding test users — note that test
users avoid Google's verification requirement under 100 users).

TASK 2 — Main chat endpoint: POST /app/api/chat/route.ts
Input: { caseId (nullable), message }.
Logic:
1. If caseId is null, create a new case row first.
2. Save the user's message to `messages`.
3. Call Gemini to CLASSIFY the message: is this person describing an actual
   legal case, or just panicking/venting with no real legal issue? Use a
   clear system prompt for this classification step, output strict JSON:
   { "is_case": boolean, "case_type": string|null, "reasoning": string }.
4. If is_case is false: respond with ONLY a comforting, calming message
   (console them) — do NOT show a "Find Lawyer" option, set case status to
   'panic'.
5. If is_case is true: 
   a. Embed the user's message via text-embedding-004.
   b. Call the Postgres function `match_legal_chunks` (already created by
      teammate) to retrieve the top 5 most relevant legal chunks.
   c. Build a RAG prompt for Gemini: system instructions to act as a
      knowledgeable, calm legal guide for Pakistan, using ONLY the retrieved
      law excerpts as grounding, never inventing legal citations. Generate a
      response that explains relevant law in plain language and reassures
      the user.
   d. After generating the response, also generate an event_log: a JSON
      object listing what information is safe to share with a lawyer
      (safe_to_share) and what's sensitive and should NOT be shared yet
      (do_not_share) — e.g., don't share full ID/CNIC numbers, exact home
      address, or anything not legally necessary at the first contact stage.
   e. Save assistant message, save event_log, update case_type and status to
      'active'.
   f. Return the response AND a flag `showFindLawyerCTA: true` so the
      frontend can show the "Find Lawyer" button.

TASK 3 — Cases endpoints:
GET /app/api/cases/route.ts — list all cases for the logged-in user (id,
title, case_type, status, created_at), sorted newest first.
GET /app/api/cases/[id]/route.ts — return one case with its full message
history and event_logs, so reopening an old case in the Cases tab works
exactly like reopening a chat thread.

TASK 4 — Lawyer search: POST /app/api/lawyers/search/route.ts
Input: { caseId, city, caseType, gender (optional, default both),
minExperience (optional), minReputation (optional) }.
Query the lawyers table with these filters, order by reputation_score desc,
return top 10. Always default gender to "any" unless explicitly filtered.

TASK 5 — Generate outreach message: POST /app/api/lawyers/generate-message/route.ts
Input: { caseId }. Pull that case's event_logs (safe_to_share fields only —
never include do_not_share fields). Use Gemini to draft a clear, professional
message to a lawyer: explain the issue using only the safe details, ask them
to take the case, ask for next steps. Return the drafted text for the user to
edit in the UI before saving.

TASK 6 — Save + contact lawyer: POST /app/api/lawyers/contact/route.ts
Input: { caseId, lawyerId, finalMessage, channel: "email"|"whatsapp"|"call" }.
- Always save finalMessage and upsert a case_lawyers row with status
  'message_sent' and contacted_at = now().
- If channel is "email": call a Gmail send function (use the stored OAuth
  refresh token) to actually send finalMessage to the lawyer's email from the
  user's Gmail.
- If channel is "whatsapp" or "call", just return the data needed (number,
  message) — the actual opening of WhatsApp/dialer happens client-side via
  wa.me and tel: links, not on the backend.
Update the case's event_log to note "contacted [lawyer name] via [channel]".

TASK 7 — Daily Gmail reply-check (cron): /app/api/cron/check-replies/route.ts
Logic: for every case_lawyers row with status 'message_sent' and
contacted_at within the last 2 days, search that user's Gmail (via stored
refresh token) for any reply from that lawyer's email address. If found:
update status to 'replied', replied_at, and store a plain-text reply_summary.
Then, for cases where at least 2 lawyers have replied, use Gemini to analyze
all replies and rank them by empathy, clarity, and stated experience/repute
in the message; mark the top 2 as status 'suggested' and store a short
"reasoning" string per lawyer (why they were suggested) in reply_summary.
Also send the user a notification email (via Gmail send) saying "Lawyer X
has replied to your case." Secure this route so it can only be triggered by
the Vercel Cron job (check a secret header/token), not publicly.

TASK 8 — Final lawyer selection: POST /app/api/lawyers/select/route.ts
Input: { caseId, lawyerId }. Set that case_lawyers row to status 'selected',
set all other lawyers for that case back to a closed/inactive state, update
the case's event_log noting the final chosen lawyer, set case status to
'in_progress'.

TASK 9 — Weekly Monday check-in (cron): /app/api/cron/weekly-checkin/route.ts
For every case with status 'active' or 'in_progress', send the user a Gmail
email asking for an update on their case and inviting them to continue the
chat. Use Gemini to slightly personalize each email using the case title.

TASK 10 — vercel.json cron config:
Add a vercel.json with two cron entries: check-replies running once daily,
weekly-checkin running every Monday morning. Use Vercel's documented free
Hobby-plan cron syntax.

TASK 11 — Documentation:
Write /docs/API.md listing every endpoint, its input/output JSON shape, and
what UI action should call it — this is what the frontend team will build
against next. Update /HANDOFF.md: what's done, what env vars were added
(e.g. a cron secret token), and that frontend integration is next.

Commit and push everything to the existing GitHub repo on a new branch, then
tell me the exact command to open a pull request into main.
```

---

## 6. STAGE 3 — Lameea & Tooba's Antigravity Prompt

Run this after Hashir & Hamza's branch is merged. Attach your Figma/Stitch screenshots and hex color codes directly to this prompt in Antigravity (drag the images in) so the agent matches your actual design instead of guessing.

```
ROLE: You are the frontend/UI engineer for "Legal Mind". FIRST: pull the
latest code, read /docs/SCHEMA.md, /docs/API.md, and /HANDOFF.md fully. The
backend API routes already exist and are documented in API.md — your job is
to build the UI and wire it to those exact endpoints, not invent new ones.

I'm attaching screenshots of our design (Figma/Stitch) and our chosen color
palette: [PASTE YOUR HEX CODES HERE, e.g. primary #1B4332, accent #95D5B2,
background #F8F9FA]. Match this design closely — exact spacing isn't
critical, but the colors, overall layout, and component style should match
what's in the screenshots.

TECH STACK (matches existing repo): Next.js 14 App Router, TypeScript,
Tailwind CSS. Use the existing Supabase client in /lib for auth/session.
Our logo file is at /public/logo-LM.png — use it in the header and the login
screen.

TASK 1 — Auth flow:
Build the login page with a "Sign in with Google" button (Supabase Auth).
After first login, show a one-time disclaimer modal: "This AI can make
mistakes and is not a substitute for a licensed lawyer." On first login only,
show a city-selector screen (dropdown of major Pakistani cities) and save
the selection to the profiles table via Supabase. Store this so it's only
asked once per user.

TASK 2 — App shell with 3 tabs:
Build a persistent bottom (mobile) or sidebar (desktop) navigation with 3
tabs: Main Chat, Cases, Lawyer Finder. Add a 4th icon for Profile and a 5th
for "Script & Guidelines" (can be a simple static info page, no backend
needed — write clear, calm guidance on what info is okay vs risky to share
with a lawyer on a first phone call).

TASK 3 — Main Chat tab:
Left sidebar listing the user's past cases (title + date), like a chat app's
history list — fetch from GET /api/cases. Clicking one loads that case's full
history via GET /api/cases/[id] into the main chat window. A "+ New Chat"
button clears the chat window to start a fresh case. Build the chat input +
message bubbles UI, calling POST /api/chat on send, streaming or just
showing the response when it returns. After any assistant response where the
API returns showFindLawyerCTA: true, show a button "Find a Lawyer for This
Case" that navigates to the Lawyer Finder tab pre-loaded with that caseId.

TASK 4 — Cases tab:
A clean list/grid of all cases as cards (title, case type badge, status
badge, date). Tapping a case opens it in the Main Chat tab (reuse the same
loading logic as Task 3).

TASK 5 — Lawyer Finder tab:
Two entry points:
(a) Arriving with a caseId already set (from the chat CTA) — skip straight
    to filters pre-filled with that case's detected city/case type.
(b) Opened directly from the tab bar — show a case picker first ("choose
    which case to find a lawyer for"); if no cases exist yet, show "Start a
    new chat first" linking to Main Chat.
Build the filter bar (case type, experience slider, reputation, city,
gender — default to "Any" gender, with explicit Male/Female/Any options) that
calls POST /api/lawyers/search and renders the returned lawyers as ID-card
components: photo placeholder, name, specialization tags, experience,
reputation stars, and three buttons — Email, WhatsApp, Call.
- Call button: a tel:+92XXXXXXXXXX link (opens native dialer).
- WhatsApp button: a https://wa.me/92XXXXXXXXXX?text=<url-encoded-message>
  link (opens WhatsApp with the saved message pre-filled).
- Email button: triggers POST /api/lawyers/contact with channel "email".
Above the cards, add a "Generate Message" button that calls
POST /api/lawyers/generate-message, shows the drafted message in an editable
textarea, and a "Save & Use This Message" button that stores it (this is
what gets used in the WhatsApp link and the Email send).
Add a "Suggested Lawyers" section (only shows once the backend has marked any
lawyers as status 'suggested') displaying the top 2 with the AI's stated
reasoning, and a "Proceed with this lawyer" button per suggestion that calls
POST /api/lawyers/select.

TASK 6 — Profile tab:
Simple page: avatar upload (store in Supabase Storage, save URL to
profiles.avatar_url), display name, city (editable), sign-out button.

TASK 7 — Script & Guidelines tab:
Static page with clear, friendly guidance: what to confirm before sharing
sensitive details on a call (e.g., confirm you're speaking to the actual
lawyer's verified number first), and a short checklist of info that's
generally fine to share early (the general nature of the issue, your city,
rough timeline) vs info to hold back until you've engaged them formally
(exact ID numbers, full home address, financial account details).

TASK 8 — Responsive design + polish:
Make sure everything works on mobile width first, then desktop. Use loading
states (skeletons or spinners) for every API call, and friendly error states
if a call fails.

TASK 9 — Deployment:
Once everything works locally (npm run dev), prepare this for Vercel
deployment: confirm next.config and vercel.json don't conflict, list every
environment variable that needs to be set in the Vercel dashboard (pull the
full list from .env.example across the whole repo), and write
/docs/DEPLOY.md with the exact steps to: connect this GitHub repo to a new
Vercel project, add the env vars, and deploy. Don't deploy yourself — list
the steps for me to click through, since that needs dashboard access.

Commit and push to a new branch, then tell me the command to open a pull
request into main.
```

---

## 7. After Stage 3: going live (whole team, ~30 minutes)

1. Merge all branches into `main` on GitHub.
2. Go to vercel.com → "New Project" → import the GitHub repo (free, no card needed).
3. Paste every env var from `.env.example` into Vercel's project settings (Supabase keys, Gemini key, Gmail OAuth client id/secret, cron secret token).
4. Deploy. You get a free `legal-mind-yourteam.vercel.app` URL — that's your hosted app, $0/month.
5. In Google Cloud Console, add your live Vercel URL as an authorized redirect URI for the OAuth client (both Supabase Auth and Gmail scopes need this).
6. Test the full flow end to end with your own Gmail accounts added as OAuth test users.

## 8. Things to watch as you grow past the demo stage

- Gemini free tier is rate-limited (~10 requests/minute) — fine for a few people testing, will need a paid key or Groq fallback for real users.
- Supabase free tier caps at 500MB DB storage and pauses after 7 days idle (handled by the keep-alive workflow above).
- Gmail's sensitive-scope OAuth needs Google's verification once you go past 100 real users — that's a real (free but slow) process, not a blocker today.
