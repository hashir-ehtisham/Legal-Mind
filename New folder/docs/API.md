# Legal Mind — API Reference

All endpoints are Next.js 14 App Router route handlers under `/app/api/`.

**Authentication**: All endpoints (except cron routes) require a Supabase JWT sent as:
```
Authorization: Bearer <supabase_access_token>
```

**Base URL (local)**: `http://localhost:3000`

---

## Auth

### `GET /api/auth/gmail`
Initiates Gmail OAuth flow. Redirects the logged-in user to Google's consent screen.

- **Auth required**: Yes (Supabase JWT in Authorization header)
- **Query params**: none
- **Redirects to**: Google OAuth consent screen → `/api/auth/gmail/callback`
- **UI action**: "Connect Gmail" button in user settings

---

### `GET /api/auth/gmail/callback`
Google calls this after the user consents. Stores the encrypted refresh token.

- **Auth required**: No (Google redirects here directly)
- **Query params**: `code`, `state` (injected by Google)
- **On success**: Redirects to `{APP_URL}?gmail_connected=true`
- **On error**: Redirects to `{APP_URL}?gmail_error=<reason>`

---

## Chat

### `POST /api/chat`
Main AI consultation endpoint. Full pipeline: classify → RAG → respond.

- **Auth required**: Yes
- **Body**:
```json
{
  "caseId": "uuid | null",
  "message": "string"
}
```
- **Response (panic path)**:
```json
{
  "caseId": "uuid",
  "response": "string (comforting message)",
  "is_case": false,
  "showFindLawyerCTA": false
}
```
- **Response (legal case path)**:
```json
{
  "caseId": "uuid",
  "response": "string (RAG-grounded legal guidance)",
  "is_case": true,
  "case_type": "Civil | Family | Corporate | Criminal | Labor | Tax",
  "showFindLawyerCTA": true
}
```
- **UI action**: User sends message in `MainChatTab.jsx`
- **Notes**: If `caseId` is null, a new case is created automatically. `showFindLawyerCTA: true` tells the frontend to show the "Find a Lawyer" button.

---

## Cases

### `GET /api/cases`
Lists the authenticated user's cases, newest first.

- **Auth required**: Yes
- **Response**:
```json
{
  "cases": [
    {
      "id": "uuid",
      "title": "string",
      "case_type": "string | null",
      "status": "panic | active | lawyer_search | in_progress | resolved",
      "created_at": "ISO timestamp"
    }
  ]
}
```
- **UI action**: `CasesTab.jsx` on mount, sidebar case list

---

### `GET /api/cases/:id`
Returns a single case with full message history and safe event_logs.

- **Auth required**: Yes (only case owner can access)
- **Response**:
```json
{
  "case": { "id": "...", "title": "...", "case_type": "...", "status": "...", "created_at": "...", "updated_at": "..." },
  "messages": [{ "id": "...", "role": "user|assistant", "content": "...", "created_at": "..." }],
  "event_logs": [{ "id": "...", "summary": "...", "safe_to_share": {}, "created_at": "..." }]
}
```
- **Note**: `do_not_share` is intentionally omitted from the response — it stays server-side only.
- **UI action**: Opening a case in `MainChatTab.jsx`

---

## Lawyers

### `POST /api/lawyers/search`
Searches the lawyers directory with filters.

- **Auth required**: Yes
- **Body**:
```json
{
  "caseId": "uuid (optional, for logging)",
  "city": "Lahore | Karachi | Islamabad",
  "caseType": "Civil | Family | Corporate | Criminal | Labor | Tax",
  "gender": "male | female | any (default: any)",
  "minExperience": 5,
  "minReputation": 3.5
}
```
- **Response**:
```json
{
  "lawyers": [
    {
      "id": "uuid",
      "name": "string",
      "gender": "string",
      "city": "string",
      "specialization": ["string"],
      "experience_years": 12,
      "reputation_score": 4.2,
      "email": "string | null",
      "whatsapp_number": "string | null",
      "bio": "string | null",
      "profile_image_url": "string | null",
      "verified": true,
      "unverified_warning": "string | null"
    }
  ]
}
```
- **Order**: `verified DESC` → `reputation_score DESC` → `experience_years DESC`
- **UI action**: `LawyerFinderTab.jsx` search button

---

### `POST /api/lawyers/generate-message`
Drafts a professional outreach message using only `safe_to_share` data.

- **Auth required**: Yes
- **Body**:
```json
{ "caseId": "uuid" }
```
- **Response**:
```json
{ "draft": "string (editable message for the user to review)" }
```
- **UI action**: "Draft Message" button in `LawyerFinderTab.jsx`

---

### `POST /api/lawyers/contact`
Saves a contact record and optionally sends a Gmail email.

- **Auth required**: Yes
- **Body**:
```json
{
  "caseId": "uuid",
  "lawyerId": "uuid",
  "finalMessage": "string",
  "channel": "email | whatsapp | call"
}
```
- **Response**:
```json
{
  "success": true,
  "channel": "email",
  "emailSent": true,
  "emailError": null,
  "whatsappUrl": "https://wa.me/923001234567 | null",
  "phoneNumber": "string | null"
}
```
- **UI action**: "Send & Contact" button after user edits the draft message

---

### `POST /api/lawyers/select`
Finalises lawyer selection, sets case to `in_progress`.

- **Auth required**: Yes
- **Body**:
```json
{ "caseId": "uuid", "lawyerId": "uuid" }
```
- **Response**:
```json
{ "success": true, "case_status": "in_progress" }
```
- **UI action**: "Select This Lawyer" button in `LawyerFinderTab.jsx`

---

## Cron Jobs (Internal — not called by the UI)

Both endpoints are secured with the `x-cron-secret` header matching `CRON_SECRET` env var.

### `GET /api/cron/check-replies`
- **Trigger**: Daily at 03:00 UTC (Vercel Cron)
- **What it does**: Checks Gmail for lawyer replies within 48hrs, ranks top 2 with Gemini, sends user notification email.
- **Response**: `{ "processed": N, "suggested": M }`

### `GET /api/cron/weekly-checkin`
- **Trigger**: Every Monday at 07:00 UTC (Vercel Cron)
- **What it does**: Sends personalised weekly update emails to all active/in_progress case owners.
- **Response**: `{ "sent": N, "skipped": M }`

---

## Error Responses

All errors follow this shape:
```json
{ "error": "Human-readable error message" }
```

| Status | Meaning |
|---|---|
| 400 | Bad request — missing or invalid fields |
| 401 | Unauthorized — missing or invalid JWT |
| 403 | Forbidden — cron secret mismatch |
| 404 | Resource not found or not owned by user |
| 422 | Unprocessable — e.g. no safe data to draft message from |
| 500 | Internal DB error |
| 502 | Upstream AI service error (Gemini) |
