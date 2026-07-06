# Legal Mind ⚖️

An AI-powered legal assistance platform tailored for Pakistan. Legal Mind helps users understand their legal rights, analyze case details, cross-reference official statute databases (Constitutions, Penal Codes, etc.) via RAG (Retrieval-Augmented Generation), and connect with verified local advocates.

---

## 🏗️ Repository Architecture

This is a monorepo containing three core components of the Legal Mind ecosystem:

```
LegalMind/
├── Legal-Mind-DB-eman/               # Database schemas, migrations, seed scripts, & crawlers
│   ├── crawler/                      # Automatic lawyer scraper bot scripts
│   ├── data/legal-docs/              # Source PDFs of official Pakistani law codes for RAG
│   └── supabase/migrations/          # Database schema migrations (Stage 1)
│
├── ai&backend-hashir-hamza/          # Next.js 14 backend & AI API services
│   ├── app/api/                      # API endpoints (Chat, Search, Message Draft, Contact)
│   └── lib/                          # Gemini client, Gmail API integration, and crypto utilities
│
└── Legal-Mind-frontend-lameea-tooba/ # Client-side web application interface
    └── New folder/                   # React + Vite application (styled with Tailwind CSS)
```

---

## 🛠️ Technology Stack

*   **Frontend**: React, Vite, Tailwind CSS, Lucide Icons
*   **Backend**: Next.js 14 App Router (API Routes), TypeScript
*   **Database & Auth**: Supabase (Postgres + pgvector + Row-Level Security + Google OAuth)
*   **AI Engine**: Google Gemini API (`gemini-2.5-flash` for reasoning/drafting, `text-embedding-004` for vector embeddings)
*   **Email Agent**: Gmail API (Google OAuth refresh token flow) for automated consultation requests
*   **Web Scraper**: Cheerio & Node.js for automated lawyer index crawler

---

## 🚀 Local Setup Instructions

### 1. Database Setup (Supabase)
1. Initialize a new project on **Supabase**.
2. Go to the SQL Editor and run the migration files located in:
    *   `Legal-Mind-DB-eman/supabase/migrations/20260630000000_init_schema.sql`
    *   `ai&backend-hashir-hamza/supabase/migrations/20260705000000_add_contact_columns.sql`
3. Configure Google OAuth in the Supabase authentication settings.

### 2. Backend Configurations
1. Navigate to the backend directory:
    ```bash
    cd "ai&backend-hashir-hamza"
    ```
2. Create a `.env.local` file based on `.env.example` and fill in your keys (Supabase keys, Gemini API key, Gmail OAuth Client credentials, and GMAIL_TOKEN_SECRET).
3. Install dependencies and start the Next.js development server:
    ```bash
    npm install
    npm run dev
    ```

### 3. Frontend Configurations
1. Navigate to the frontend application directory:
    ```bash
    cd "Legal-Mind-frontend-lameea-tooba/New folder"
    ```
2. Create a `.env` file setting up `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Install dependencies and start the Vite development server:
    ```bash
    npm install
    npm run dev
    ```

### 4. Populate Database (Crawler)
To populate the database table with lawyer listings, run the crawler script from the backend directory:
```bash
npm run crawl-lawyers
```

---

## 👥 Contributors
*   **Hashir & Hamza** — Backend, AI Ingestion & Gmail Outreach API
*   **Eman** — Database Schema, RAG PDF Ingestion & Scraping Bot
*   **Lameea & Tooba** — UI/UX Design & Frontend React Application
