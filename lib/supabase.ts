import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// If running in Node.js (scripts), load env variables
if (typeof window === 'undefined') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL or Key is missing. Verify your environment configuration.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export function getServiceSupabaseClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in environment');
  }
  return createClient(supabaseUrl, serviceKey);
}
