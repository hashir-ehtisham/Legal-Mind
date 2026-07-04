// TASK 4 — POST /api/lawyers/search
// Input: { caseId, city, caseType, gender?, minExperience?, minReputation? }
// Returns top 10 lawyers ordered: verified desc → reputation desc → experience desc

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const accessToken = auth.replace('Bearer ', '').trim();
  if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAnonClient(accessToken);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    caseId?: string;
    city?: string;
    caseType?: string;
    gender?: string;
    minExperience?: number;
    minReputation?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { city, caseType, gender, minExperience, minReputation } = body;

  if (!city || !caseType) {
    return NextResponse.json({ error: 'city and caseType are required' }, { status: 400 });
  }

  // Build query
  let query = supabase
    .from('lawyers')
    .select(
      'id, name, gender, city, specialization, experience_years, reputation_score, email, whatsapp_number, bio, profile_image_url, verified',
    )
    .ilike('city', `%${city}%`)
    // Match caseType against any specialization in the array
    .contains('specialization', [caseType])
    .order('verified', { ascending: false })
    .order('reputation_score', { ascending: false, nullsFirst: false })
    .order('experience_years', { ascending: false, nullsFirst: false })
    .limit(10);

  if (gender && gender !== 'any') {
    query = query.ilike('gender', gender);
  }
  if (minExperience != null) {
    query = query.gte('experience_years', minExperience);
  }
  if (minReputation != null) {
    query = query.gte('reputation_score', minReputation);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[lawyers/search]', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  // Annotate unverified lawyers so frontend can show a warning
  const lawyers = (data ?? []).map(l => ({
    ...l,
    unverified_warning: !l.verified
      ? 'This listing is from a public directory and has not been verified by Legal Mind. Details may be outdated.'
      : null,
  }));

  return NextResponse.json({ lawyers });
}
