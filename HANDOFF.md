# Project Handoff: Legal Mind Backend & Ingestion Pipeline

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
