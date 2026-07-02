-- Enable the pgvector extension to work with embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    full_name text,
    avatar_url text,
    city text,
    created_at timestamptz DEFAULT now()
);

-- CASES
CREATE TABLE IF NOT EXISTS public.cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    title text NOT NULL,
    case_type text,
    status text DEFAULT 'active' NOT NULL CHECK (status IN ('panic', 'active', 'lawyer_search', 'in_progress', 'resolved')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('user', 'assistant')),
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- EVENT LOGS
CREATE TABLE IF NOT EXISTS public.event_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    summary text NOT NULL,
    safe_to_share jsonb DEFAULT '{}'::jsonb NOT NULL,
    do_not_share jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- LEGAL DOCUMENTS
CREATE TABLE IF NOT EXISTS public.legal_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    law_category text,
    source_url text
);

-- LEGAL CHUNKS (For RAG)
CREATE TABLE IF NOT EXISTS public.legal_chunks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    content text NOT NULL,
    embedding vector(768),
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

-- LAWYERS
CREATE TABLE IF NOT EXISTS public.lawyers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    gender text,
    city text NOT NULL,
    specialization text[],
    experience_years int,
    reputation_score numeric,
    email text,
    whatsapp_number text,
    bio text,
    profile_image_url text,
    source_url text,
    last_crawled_at timestamptz,
    verified boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- CASE LAWYERS (Shortlists / Matches)
CREATE TABLE IF NOT EXISTS public.case_lawyers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    lawyer_id uuid NOT NULL REFERENCES public.lawyers(id) ON DELETE CASCADE,
    status text DEFAULT 'shortlisted' NOT NULL CHECK (status IN ('shortlisted', 'message_sent', 'replied', 'suggested', 'selected')),
    message_sent text,
    contacted_at timestamptz,
    replied_at timestamptz,
    reply_summary text,
    reply_sentiment_score numeric,
    UNIQUE(case_id, lawyer_id)
);

-- WEEKLY CHECKINS
CREATE TABLE IF NOT EXISTS public.weekly_checkins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    sent_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- Profiles
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Cases
CREATE POLICY "Users can view own cases" 
    ON public.cases FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cases" 
    ON public.cases FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cases" 
    ON public.cases FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cases" 
    ON public.cases FOR DELETE 
    USING (auth.uid() = user_id);

-- Messages
CREATE POLICY "Users can view messages for own cases" 
    ON public.messages FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = messages.case_id AND cases.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert messages in own cases" 
    ON public.messages FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = messages.case_id AND cases.user_id = auth.uid()
    ));

-- Event Logs
CREATE POLICY "Users can view event logs for own cases" 
    ON public.event_logs FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = event_logs.case_id AND cases.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert event logs in own cases" 
    ON public.event_logs FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = event_logs.case_id AND cases.user_id = auth.uid()
    ));

-- Legal Documents & Chunks (Public read-only, write restricted to service role/admin)
CREATE POLICY "Anyone can view legal documents" 
    ON public.legal_documents FOR SELECT 
    USING (true);

CREATE POLICY "Anyone can view legal chunks" 
    ON public.legal_chunks FOR SELECT 
    USING (true);

-- Lawyers (Read-only for authenticated users, write restricted)
CREATE POLICY "Authenticated users can view lawyer listings" 
    ON public.lawyers FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Case Lawyers
CREATE POLICY "Users can view case-lawyer matches for own cases" 
    ON public.case_lawyers FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = case_lawyers.case_id AND cases.user_id = auth.uid()
    ));

CREATE POLICY "Users can update/insert case-lawyer matches for own cases" 
    ON public.case_lawyers FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = case_lawyers.case_id AND cases.user_id = auth.uid()
    ));

-- Weekly Checkins
CREATE POLICY "Users can view weekly checkins for own cases" 
    ON public.weekly_checkins FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = weekly_checkins.case_id AND cases.user_id = auth.uid()
    ));

-- Create HNSW Vector Index on legal_chunks.embedding
CREATE INDEX IF NOT EXISTS legal_chunks_embedding_hnsw_idx 
ON public.legal_chunks 
USING hnsw (embedding vector_cosine_ops);

-- Similarity Search Function
CREATE OR REPLACE FUNCTION public.match_legal_chunks(
    query_embedding vector(768),
    match_count int
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    content text,
    metadata jsonb,
    similarity numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        lc.id,
        lc.document_id,
        lc.content,
        lc.metadata,
        (1 - (lc.embedding <=> query_embedding))::numeric AS similarity
    FROM public.legal_chunks lc
    ORDER BY lc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
