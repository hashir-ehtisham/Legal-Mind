-- Migration: Add columns required by the backend API layer
-- Safe to run on the existing schema — all changes are purely additive.

-- 1. Track how a lawyer was contacted (email / whatsapp / call)
ALTER TABLE public.case_lawyers
  ADD COLUMN IF NOT EXISTS channel text
    CHECK (channel IN ('email', 'whatsapp', 'call'));

-- 2. Store Gemini's reasoning when a lawyer reply is ranked 'suggested'
ALTER TABLE public.case_lawyers
  ADD COLUMN IF NOT EXISTS suggested_reasoning text;

-- 3. Store AES-256-GCM encrypted Gmail refresh token per user
--    Format: iv:authTag:ciphertext (all hex)
--    Never store plaintext refresh tokens.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gmail_refresh_token_enc text;
