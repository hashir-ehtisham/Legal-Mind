# Legal Mind Backend — Handoff Document

**Branch**: `backend/hashir-hamza`
**Status**: All 11 tasks implemented and ready for integration testing.

---

## What Was Built

### Project Location
`D:\PROJECTS\Applications\Legal Mind\my-part\ai&backend-hashir-hamza`

### Architecture
Next.js 14 App Router — API-only backend. All logic lives in `/app/api/`. Shared utilities in `/lib/`.

### Completed Tasks

| Task | Endpoint | Status |
|---|---|---|
| 1 | `GET /api/auth/gmail` + `/api/auth/gmail/callback` | ✅ Done |
| 2 | `POST /api/chat` | ✅ Done |
| 3 | `GET /api/cases` + `GET /api/cases/:id` | ✅ Done |
| 4 | `POST /api/lawyers/search` | ✅ Done |
| 5 | `POST /api/lawyers/generate-message` | ✅ Done |
| 6 | `POST /api/lawyers/contact` | ✅ Done |
| 7 | `GET /api/cron/check-replies` (daily) | ✅ Done |
| 8 | `POST /api/lawyers/select` | ✅ Done |
| 9 | `GET /api/cron/weekly-checkin` (Monday) | ✅ Done |
| 10 | `vercel.json` cron config | ✅ Done |
| 11 | `docs/API.md` + `docs/GMAIL_SETUP.md` + `HANDOFF.md` | ✅ Done |

---

## New Environment Variables Added

Copy `.env.example` to `.env.local` and fill these in:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API |
| `GEMINI_API_KEY` | https://aistudio.google.com |
| `GMAIL_CLIENT_ID` | Google Cloud Console — see `docs/GMAIL_SETUP.md` |
| `GMAIL_CLIENT_SECRET` | Google Cloud Console — see `docs/GMAIL_SETUP.md` |
| `GMAIL_REDIRECT_URI` | `http://localhost:3000/api/auth/gmail/callback` |
| `GMAIL_TOKEN_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CRON_SECRET` | Any long random string (also set in Vercel Dashboard) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` (local) or your Vercel URL |

---

## Database Migration Required

Run this in your Supabase SQL Editor **before** testing any endpoint:

```
supabase/migrations/20260705000000_add_contact_columns.sql
```

Or paste this directly:
```sql
ALTER TABLE public.case_lawyers ADD COLUMN IF NOT EXISTS channel text CHECK (channel IN ('email', 'whatsapp', 'call'));
ALTER TABLE public.case_lawyers ADD COLUMN IF NOT EXISTS suggested_reasoning text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gmail_refresh_token_enc text;
```

---

## How to Run Locally

```bash
cd "D:\PROJECTS\Applications\Legal Mind\my-part\ai&backend-hashir-hamza"
npm install
cp .env.example .env.local
# Fill in .env.local with real credentials
npm run dev
# Server starts at http://localhost:3000
```

---

## For the Frontend Team (lameea-tooba)

The frontend currently uses mock data. To connect it to this real backend:

### 1. Chat (`MainChatTab.jsx` — `handleSend`)
Replace the mock `setTimeout` response with:
```javascript
const res = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAccessToken}`
  },
  body: JSON.stringify({ caseId: activeCaseId, message: userText })
});
const data = await res.json();
// data.response  = AI message text
// data.showFindLawyerCTA = true/false (show "Find Lawyer" button)
// data.caseId    = UUID (use this if caseId was null)
```

### 2. Cases List (`CasesTab.jsx` + sidebar)
Replace `INITIAL_CASES` + localStorage with:
```javascript
const res = await fetch('/api/cases', {
  headers: { 'Authorization': `Bearer ${supabaseAccessToken}` }
});
const { cases } = await res.json();
```

### 3. Single Case (`MainChatTab.jsx` — on case select)
```javascript
const res = await fetch(`/api/cases/${caseId}`, {
  headers: { 'Authorization': `Bearer ${supabaseAccessToken}` }
});
const { case: caseData, messages, event_logs } = await res.json();
```

### 4. Lawyer Search (`LawyerFinderTab.jsx`)
Replace `LAWYERS_DATABASE` filter with:
```javascript
const res = await fetch('/api/lawyers/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAccessToken}` },
  body: JSON.stringify({ city, caseType, gender, minExperience })
});
const { lawyers } = await res.json();
// Show lawyers[n].unverified_warning if present
```

### 5. Contact a Lawyer
- Call `POST /api/lawyers/generate-message` to get a draft.
- Let the user edit it.
- Call `POST /api/lawyers/contact` with `channel: "email"`, `"whatsapp"`, or `"call"`.
- For whatsapp/call, use the returned `whatsappUrl` / `phoneNumber` to open the native link.

### 6. Supabase Access Token
Get it from the Supabase client after login:
```javascript
const { data: { session } } = await supabase.auth.getSession();
const accessToken = session?.access_token;
```

---

## Key Design Decisions

1. **Separate Gmail OAuth** — Supabase's built-in Google login does not support incremental scopes. Gmail access is granted via a separate `GET /api/auth/gmail` flow after login.

2. **Refresh tokens encrypted at rest** — `profiles.gmail_refresh_token_enc` stores AES-256-GCM ciphertext. The key (`GMAIL_TOKEN_SECRET`) lives only in env vars, never in the DB.

3. **`do_not_share` never leaves the server** — The `/api/cases/:id` endpoint returns `safe_to_share` event_log fields only. `do_not_share` (raw messages, CNIC, address) is stored but never returned to the client.

4. **Embedding model** — Uses `gemini-embedding-001` (768-dim) to match the ingestion pipeline in `Legal-Mind-DB-eman`. Do not change this without re-ingesting all legal documents.

5. **Cron security** — Both cron routes check `x-cron-secret` header against `CRON_SECRET` env var. Vercel sends this automatically via `vercel.json` headers config.
