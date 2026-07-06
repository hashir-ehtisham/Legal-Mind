# Project Handoff: Legal Mind Backend & Ingestion Pipeline

Welcome to the **Legal Mind** codebase — an AI-powered legal assistance web application for Pakistan. This document explains what has been built, what environment variables you need to fill in, what still needs to be run manually before data is real, and what is next.

---

## 1. What Has Been Built

### 🏗️ Project Structure & Scaffolding
- Next.js 14 (App Router), TypeScript, Tailwind CSS, and ESLint initialized at root.
- Dedicated directories:
  - [/lib](file:///c:/sem6/projects/legal-mind/lib): Shared service clients ([supabase.ts](file:///c:/sem6/projects/legal-mind/lib/supabase.ts) and [gemini.ts](file:///c:/sem6/projects/legal-mind/lib/gemini.ts)).
  - [/supabase/migrations](file:///c:/sem6/projects/legal-mind/supabase/migrations): SQL schema migrations.
  - [/scripts](file:///c:/sem6/projects/legal-mind/scripts): Batch scripts ([ingest-legal-docs.ts](file:///c:/sem6/projects/legal-mind/scripts/ingest-legal-docs.ts) and [crawl-lawyers.ts](file:///c:/sem6/projects/legal-mind/scripts/crawl-lawyers.ts)).
  - [/crawler](file:///c:/sem6/projects/legal-mind/crawler): Modular production-grade crawler package (see below).
  - [/data/legal-docs](file:///c:/sem6/projects/legal-mind/data/legal-docs): Repository for source legal documents (PDF, TXT, HTML, DOCX) to seed RAG.
  - [/.github/workflows](file:///c:/sem6/projects/legal-mind/.github/workflows): Scheduled automation jobs.
  - [/docs](file:///c:/sem6/projects/legal-mind/docs): Comprehensive schemas, crawler info, and setup guides.

---

### 🗄️ Supabase Postgres Schema ([migration](file:///c:/sem6/projects/legal-mind/supabase/migrations/20260630000000_init_schema.sql))
- Enforces strict table relations and check constraints (e.g. case status constraints).
- Enables `pgvector` and provisions `legal_chunks` with a `vector(768)` embedding field.
- Sets up an **HNSW vector index** optimized for cosine distance search.
- Exposes an RPC function `match_legal_chunks(query_embedding vector(768), match_count int)` for RAG search.
- Enables **Row Level Security (RLS)** on all user-facing data tables.

---

### 📄 RAG Ingestion Pipeline ([ingest-legal-docs.ts](file:///c:/sem6/projects/legal-mind/scripts/ingest-legal-docs.ts))
- Reads and parses PDF, DOCX, HTML, and TXT files from `/data/legal-docs/`.
- Cleans PDF artifacts (headers, footers, page numbers) while maintaining section structures.
- Chunks text into ~500-token blocks with 50-token overlap.
- Generates 768-dimension embeddings via Gemini `text-embedding-004`.
- **Chunk-level resume**: If a document was partially ingested previously, the script identifies already-stored chunk indices and skips them — no data is deleted or re-processed.
- **Exponential back-off**: The `getEmbeddingWithRetry()` wrapper handles `429` (rate limit) and `503` (service unavailable) errors automatically.
- **Throttling**: 1 000 ms between embedding requests to stay within Gemini free-tier limits.
- Inserts document metadata and chunk vectors to Supabase using a service role key.

---

### 🕷️ Modular Production Lawyer Crawler ([crawler/](file:///c:/sem6/projects/legal-mind/crawler))
The old single-file crawler has been **completely rewritten** as a modular package under `/crawler/`. Each module has a single responsibility:

| Module | Purpose |
|---|---|
| [fetch.ts](file:///c:/sem6/projects/legal-mind/crawler/fetch.ts) | HTTP fetch with random user-agent rotation + Playwright fallback for JS-heavy pages |
| [robots.ts](file:///c:/sem6/projects/legal-mind/crawler/robots.ts) | Parses `robots.txt`, checks `Disallow` rules, and reads `Crawl-delay` |
| [discovery.ts](file:///c:/sem6/projects/legal-mind/crawler/discovery.ts) | Follows listing pages, pagination, and collects profile URLs |
| [parser.ts](file:///c:/sem6/projects/legal-mind/crawler/parser.ts) | Extracts lawyer fields (name, phone, email, bio, etc.) from profile HTML |
| [retry.ts](file:///c:/sem6/projects/legal-mind/crawler/retry.ts) | Generic exponential back-off utility with jitter |
| [logger.ts](file:///c:/sem6/projects/legal-mind/crawler/logger.ts) | Crawl statistics (found / parsed / inserted / updated / skipped / errors) |
| [selectors.ts](file:///c:/sem6/projects/legal-mind/crawler/selectors.ts) | Generic CSS selectors + 12 seed sources (bar councils + major law firms) |
| [crawler.ts](file:///c:/sem6/projects/legal-mind/crawler/crawler.ts) | Orchestrator: loops sources, calls Gemini to normalize specializations, upserts to Supabase |

**Seed sources configured** (in `selectors.ts`):
- Pakistan Bar Council, Lahore High Court Bar Association, Punjab Bar Council, Islamabad Bar Council, Sindh Bar Council, Peshawar High Court Bar Association
- Law firms: Cornelius & Lane, Mandviwalla & Zafar, Vellani & Vellani, ABS & Co, Axis Law Chambers, EasyQanoon

**Key improvements over the old crawler:**
- ✅ Respects `robots.txt` and declared crawl delays
- ✅ Rotates user-agents (5 realistic browser UA strings)
- ✅ Falls back to Playwright (headless Chromium) for JavaScript-rendered pages
- ✅ Generic CSS selectors — works on any lawyer directory, not just 3 hardcoded sites
- ✅ Deduplicates by email → phone → normalized name+city before upserting
- ✅ Uses Gemini structured JSON output to normalize specializations and estimate experience years
- ✅ Logs crawl statistics per source

---

### 🤖 GitHub Actions Automation
- [crawl-lawyers.yml](file:///c:/sem6/projects/legal-mind/.github/workflows/crawl-lawyers.yml): Runs the crawler weekly on Sundays.
- [keepalive.yml](file:///c:/sem6/projects/legal-mind/.github/workflows/keepalive.yml): Runs every 3 days. Pings the Supabase REST API to keep the free database project alive (Supabase pauses free projects after 7 days of inactivity).

---

## 2. Environment Variables You Must Fill In

Create a file named `.env.local` at the project root. Copy from [.env.example](file:///c:/sem6/projects/legal-mind/.env.example):

```env
# Next.js Public Keys (safe to expose to the browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-public-key

# Supabase Service Role Key (SECRET — server-side only, bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Google Gemini API Key (get a free key from https://aistudio.google.com)
GEMINI_API_KEY=your-gemini-api-key
```

**Where to get these:**
- **Supabase keys**: Go to your Supabase project → Settings → API. Copy the Project URL and both the `anon` (public) and `service_role` keys.
- **Gemini API key**: Go to [Google AI Studio](https://aistudio.google.com) → Get API Key → Create API key in new project.

> [!CAUTION]
> Never commit `.env.local` to Git. It is already in `.gitignore`. The `SUPABASE_SERVICE_ROLE_KEY` bypasses all Row Level Security — treat it like a password.

For GitHub Actions to work, add these as **repository secrets** in:
`GitHub → Repository Settings → Secrets and variables → Actions`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

---

## 3. ⚠️ Data Is NOT Real Yet — You Must Run These Scripts

> [!IMPORTANT]
> The Supabase database schema has been created and deployed, but **the tables are currently empty**. No real data will be present until you manually run the following steps.

### Step 1: Add Legal PDFs

Place Pakistani legal documents (Constitution, Pakistan Penal Code, Family Laws, etc.) in:
```
/data/legal-docs/
```
Supported formats: `.pdf`, `.txt`, `.html`, `.docx`

### Step 2: Run the ingestion script

```bash
npm run ingest-legal-docs
```

This will chunk all documents and generate vector embeddings in Supabase. It supports chunk-level resume — safe to stop and restart.

### Step 3: Run the lawyer crawler

```bash
npm run crawl-lawyers
```

This crawls 12 seed sources and populates the `lawyers` table. It requires an internet connection and may take 10–30 minutes depending on network conditions. Playwright browsers must be installed first:

```bash
npx playwright install
```

---

## 4. What Is Next (Backend API Work)

The data layer is complete. The next phase is building the **API and UI** layer:

1. **Chat API** (`/app/api/chat/route.ts`):
   - Accept user messages, call `match_legal_chunks` RPC to retrieve relevant legal context via vector search, and pass context + conversation history to Gemini for a RAG-grounded response.

2. **Lawyer Match API** (`/app/api/lawyer-match/route.ts`):
   - Accept case details (city, case type), query the `lawyers` table by matching specialization and city, and return ranked recommendations.

3. **Authentication** (`/app/api/auth`):
   - Wire up Supabase Auth (Google OAuth already configured as a provider in the migration). Protect all case/message routes with `auth.uid()` checks.

4. **Frontend UI** (`/app`):
   - Build chat panel, lawyer directory browser, case dashboard, and shortlisting UX connected to the above APIs.

---

## 5. Running Locally

```bash
npm install
npx playwright install   # needed for the crawler
cp .env.example .env.local
# fill in .env.local with real credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 6. Branch Structure

| Branch | Purpose |
|---|---|
| `main` | Stable production-ready code |
| `DB-eman` | Database schema, ingestion pipeline, and crawler (this work) |


Welcome to the **Legal Mind** codebase—an AI-powered legal assistance web application for Pakistan. As the foundational backend architect, I have set up the core directories, database migrations, document ingestion pipelines, lawyer directory crawlers, and GitHub Actions automation. 

Below is the state of the codebase and the instructions to get everything up and running.

---

## 1. What has been Built

### 🏗️ Project Structure & Scaffolding
- Next.js 14 (App Router), TypeScript, Tailwind CSS, and ESLint initialized at root.
- Dedicated directories:
  - [/lib](file:///c:/sem6/projects/legal-mind/lib): Shared service clients ([supabase.ts](file:///c:/sem6/projects/legal-mind/lib/supabase.ts) and [gemini.ts](file:///c:/sem6/projects/legal-mind/lib/gemini.ts)).
  - [/supabase/migrations](file:///c:/sem6/projects/legal-mind/supabase/migrations): SQL schema migrations.
  - [/scripts](file:///c:/sem6/projects/legal-mind/scripts): Batch scripts ([ingest-legal-docs.ts](file:///c:/sem6/projects/legal-mind/scripts/ingest-legal-docs.ts) and [crawl-lawyers.ts](file:///c:/sem6/projects/legal-mind/scripts/crawl-lawyers.ts)).
  - [/data/legal-docs](file:///c:/sem6/projects/legal-mind/data/legal-docs): Repository for source legal documents (PDF, TXT, HTML, DOCX) to seed RAG. Includes a [sample-law.txt](file:///c:/sem6/projects/legal-mind/data/legal-docs/sample-law.txt) for verification.
  - [/.github/workflows](file:///c:/sem6/projects/legal-mind/.github/workflows): Scheduled automation jobs.
  - [/docs](file:///c:/sem6/projects/legal-mind/docs): Comprehensive schemas, crawler information, and setup guides.

### 🗄️ Supabase Postgres Schema ([migration](file:///c:/sem6/projects/legal-mind/supabase/migrations/20260630000000_init_schema.sql))
- Enforces strict table relations and check constraints (e.g. case status constraints).
- Enables pgvector and provisions `legal_chunks` with a `vector(768)` embedding field.
- Sets up an **HNSW vector index** optimized for cosine distance search.
- Exposes a Postgres RPC function `match_legal_chunks(query_embedding vector(768), match_count int)` for RAG search.
- Enables **Row Level Security (RLS)** on all user-facing data tables.

### 📄 RAG Ingestion Pipeline ([ingest-legal-docs.ts](file:///c:/sem6/projects/legal-mind/scripts/ingest-legal-docs.ts))
- Reads and parses PDF, DOCX, HTML, and TXT files.
- Cleans PDF/text artifacts (headers, footers, page numbers) while maintaining section structures.
- Chunks text into ~500-token blocks with a 50-token overlap, keeping paragraph and sentence boundaries intact.
- Generates 768-dimension embeddings using Gemini's official `text-embedding-004` model.
- Inserts document profiles and chunks with vectors to Supabase using a service role key.

### 🕷️ Lawyer Directory Crawler ([crawl-lawyers.ts](file:///c:/sem6/projects/legal-mind/scripts/crawl-lawyers.ts))
- Complies with `robots.txt` rules and respects declared crawl-delays.
- Throttles requests (minimum 1.5s delay between requests to a domain).
- Scrapes listings from three seed portals: `pakistanlawyer.com`, `pk.pathlegal.com`, and `solicitors.pk`.
- Uses `gemini-2.5-flash` with structured JSON output schema config to extract lawyer specializations and practice experience years.
- Performs client-side deduplication against database records based on normalized name, city, and phone number before updating or inserting.
- Gracefully falls back to mock HTML parser flows if external endpoints block connections.

### 🤖 GitHub Actions Automation
- [crawl-lawyers.yml](file:///c:/sem6/projects/legal-mind/.github/workflows/crawl-lawyers.yml): Runs the crawler weekly on Sundays.
- [keepalive.yml](file:///c:/sem6/projects/legal-mind/.github/workflows/keepalive.yml): Runs every 3 days. Pings the Supabase REST API to keep the database from hibernation.

---

## 2. Environment Variables

Create a file named `.env.local` (for Next.js and scripts) or `.env` at the project root using the templates in [.env.example](file:///c:/sem6/projects/legal-mind/.env.example):

```env
# Next.js Public Keys (Available client-side)
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Supabase Server Key (Secret, bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Google Gemini API Key
GEMINI_API_KEY=your-gemini-api-key
```

---

## 3. Running Scripts Locally

You can execute the scripts directly using `npm run`:

### Ingesting Legal Documents
Place legal documents (Constitution of Pakistan, Penal Code, Family laws, etc.) inside the [/data/legal-docs](file:///c:/sem6/projects/legal-mind/data/legal-docs) directory, then run:
```bash
npm run ingest-legal-docs
```

### Crawling Lawyer Listings
To scrape directories, extract specializations, and upsert listings:
```bash
npm run crawl-lawyers
```

---

## 4. Crucial Next Steps for Teammates

> [!IMPORTANT]
> **Data Population**: Currently, the database is empty except for local test models. You must run the crawler script at least once, and load Pakistani legal PDFs into `/data/legal-docs/` and run the ingestion script to make RAG and matches operational.
> 
> **Secrets Configuration**: Ensure repository secrets (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `GEMINI_API_KEY`) are set in GitHub Settings prior to pushing workflows.

### Upcoming Architecture Phases
1. **API Endpoints**: Build Next.js Route Handlers (`/app/api/chat/route.ts` and `/app/api/lawyer-match/route.ts`) to handle chat requests and serve matched lawyers.
2. **Context Retrieval**: Integrate the `match_legal_chunks` RPC function into your chat handlers to dynamically fetch relevant legal context for RAG prompts.
3. **Frontend UI**: Assemble chat panels, search queries, and shortlisting dashboards connected to the Supabase client.

---

## 5. Git Commit & Repository Push

To initialize git and push the bootstrapped codebase to a new repository named `legal-mind` on GitHub:

```bash
# Ensure git is initialized and track files
git init
git add .

# Create the initial commit
git commit -m "feat: bootstrap legal-mind project with Supabase schema, RAG ingestion, lawyer crawler, and automated actions"

# Rename branch to main
git branch -M main

# Add your remote URL (replace username with actual)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/legal-mind.git

# Push code
git push -u origin main
```
