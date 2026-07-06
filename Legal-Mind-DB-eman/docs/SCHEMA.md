# Database Schema Reference

This document outlines the Supabase Postgres schema, relationships, and Row Level Security (RLS) configurations established for Legal Mind.

---

## Entity Relationship Overview

The schema is built around three core pillars:
1. **User Accounts & Case Management** (`profiles`, `cases`, `messages`, `event_logs`, `weekly_checkins`)
2. **RAG Vector Search** (`legal_documents`, `legal_chunks`)
3. **Lawyer Directory & Matchmaking** (`lawyers`, `case_lawyers`)

---

## 1. Profiles Table (`profiles`)
Stores extended user profile data linked directly to Supabase Auth.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key, `REFERENCES auth.users` | Unique identifier matching the Supabase Auth user ID. |
| `full_name` | `text` | - | Full name of the user. |
| `avatar_url` | `text` | - | URL to the user's avatar image. |
| `city` | `text` | - | City of residence in Pakistan (e.g. Lahore, Karachi). |
| `created_at` | `timestamptz` | `DEFAULT now()` | Record creation timestamp. |

- **RLS Policy**: Users can only view (`SELECT`), insert (`INSERT`), and update (`UPDATE`) their own profile.

---

## 2. Cases Table (`cases`)
Manages legal assistance requests or cases created by users.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key, `DEFAULT gen_random_uuid()` | Unique case identifier. |
| `user_id` | `uuid` | `REFERENCES auth.users` | Owner of the case. |
| `title` | `text` | `NOT NULL` | User-defined title for the case/issue. |
| `case_type` | `text` | - | Category of law (e.g., Family, Property). |
| `status` | `text` | `DEFAULT 'active'`, `CHECK status IN ('panic', 'active', 'lawyer_search', 'in_progress', 'resolved')` | Operational state of the case. |
| `created_at` | `timestamptz` | `DEFAULT now()` | When the case was registered. |
| `updated_at` | `timestamptz` | `DEFAULT now()` | When the case status or details were last modified. |

- **RLS Policy**: Users can perform all operations (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) only on cases they own (`auth.uid() = user_id`).

---

## 3. Messages Table (`messages`)
Stores message history for AI legal assistance chats within a case.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key | Message identifier. |
| `case_id` | `uuid` | `REFERENCES cases(id) ON DELETE CASCADE` | The case context this message belongs to. |
| `role` | `text` | `CHECK role IN ('user', 'assistant')` | Speaker of the message. |
| `content` | `text` | `NOT NULL` | Text body of the message. |
| `created_at` | `timestamptz` | `DEFAULT now()` | Messaging timestamp. |

- **RLS Policy**: Users can only query or insert messages if they own the parent case.

---

## 4. Event Logs Table (`event_logs`)
Maintains summaries and sharing permissions of legal events during case progress.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key | Log identifier. |
| `case_id` | `uuid` | `REFERENCES cases(id) ON DELETE CASCADE` | Associated case. |
| `summary` | `text` | `NOT NULL` | Plain text overview of the event. |
| `safe_to_share` | `jsonb` | `DEFAULT '{}'`, `NOT NULL` | Information safe to share with external matches (lawyers). |
| `do_not_share` | `jsonb` | `DEFAULT '{}'`, `NOT NULL` | Restricted private details (PII). |
| `created_at` | `timestamptz` | `DEFAULT now()` | Log creation time. |

- **RLS Policy**: Users can only view or insert event logs if they own the parent case.

---

## 5. Legal Documents Table (`legal_documents`)
Metastore for official laws, acts, and statutory definitions parsed into the system.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key | Document identifier. |
| `title` | `text` | `NOT NULL` | Official name of the law or act. |
| `law_category` | `text` | - | Category (e.g. Constitutional Law, Family Law). |
| `source_url` | `text` | - | Link/path to the source document. |

- **RLS Policy**: Public read-only (`SELECT` allowed for all). Mutations are restricted.

---

## 6. Legal Chunks Table (`legal_chunks`)
Stores granular sections of legal text and their mathematical vector representations for RAG.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key | Chunk identifier. |
| `document_id` | `uuid` | `REFERENCES legal_documents(id) ON DELETE CASCADE` | Source document. |
| `content` | `text` | `NOT NULL` | Cleaned raw text chunk (~500 tokens). |
| `embedding` | `vector(768)` | Index: HNSW Cosine | Vector embedding created via `text-embedding-004`. |
| `metadata` | `jsonb` | `DEFAULT '{}'`, `NOT NULL` | Auxiliary values (e.g. filename, chunk index). |

- **RLS Policy**: Public read-only.
- **Index**: HNSW (Hierarchical Navigable Small World) index is created using cosine distance matching for semantic similarity searches.

---

## 7. Lawyers Table (`lawyers`)
A master list of lawyers crawled across Pakistan's legal directories.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key | Lawyer identifier. |
| `name` | `text` | `NOT NULL` | Full name of the attorney. |
| `gender` | `text` | - | Gender. |
| `city` | `text` | `NOT NULL` | Operating city. |
| `specialization` | `text[]` | - | Array of parsed practice areas. |
| `experience_years`| `int` | - | Estimated years of legal practice. |
| `reputation_score`| `numeric` | - | Placeholder score (leave null). |
| `email` | `text` | - | Email address. |
| `whatsapp_number` | `text` | - | Contact/WhatsApp phone number. |
| `bio` | `text` | - | Biography or listing details. |
| `profile_image_url`| `text` | - | Link to lawyer photo. |
| `source_url` | `text` | - | The crawler source listing link. |
| `last_crawled_at`| `timestamptz` | - | Time when last scraped. |
| `verified` | `boolean` | `DEFAULT false` | True if verified by our platform admins. |
| `created_at` | `timestamptz` | `DEFAULT now()` | Date added to directory. |

- **RLS Policy**: Read-only access for authenticated users (`SELECT USING (auth.role() = 'authenticated')`).

---

## 8. Case Lawyers Table (`case_lawyers`)
Handles recommendations, shortlists, and communications between cases and lawyers.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key | Match record identifier. |
| `case_id` | `uuid` | `REFERENCES cases(id) ON DELETE CASCADE` | Connected case. |
| `lawyer_id` | `uuid` | `REFERENCES lawyers(id) ON DELETE CASCADE` | Connected lawyer. |
| `status` | `text` | `DEFAULT 'shortlisted'`, `CHECK status IN ('shortlisted', 'message_sent', 'replied', 'suggested', 'selected')` | Match lifecycle state. |
| `message_sent` | `text` | - | Body of initial contact message. |
| `contacted_at` | `timestamptz` | - | Timestamp of when contact was made. |
| `replied_at` | `timestamptz` | - | Timestamp of when lawyer replied. |
| `reply_summary` | `text` | - | Summary of response text. |
| `reply_sentiment_score`| `numeric`| - | Calculated sentiment of reply. |

- **RLS Policy**: Users can perform all operations only on records associated with cases they own.
- **Constraints**: Unique composite constraint on `(case_id, lawyer_id)` prevents duplicate listings.

---

## 9. Weekly Checkins Table (`weekly_checkins`)
Tracks system-initiated automated check-ins scheduled for active cases.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key | Record identifier. |
| `case_id` | `uuid` | `REFERENCES cases(id) ON DELETE CASCADE` | Associated case. |
| `sent_at` | `timestamptz` | `DEFAULT now()` | Time when check-in ping was fired. |

- **RLS Policy**: Users can read check-ins if they own the related case.
