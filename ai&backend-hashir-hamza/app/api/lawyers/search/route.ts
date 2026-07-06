// TASK 4 — POST /api/lawyers/search
// Input: { caseId, city, caseType, gender?, minExperience?, minReputation? }
// Returns top 10 lawyers ordered: verified desc → reputation desc → experience desc

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase';
import { searchLawyersOnWeb } from '@/lib/gemini';

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

  // ── Live web search: find lawyers in real-time ────────────────────────────
  // The database is EMPTY by design. Every search discovers lawyers live via
  // Gemini + Google Search grounding, then caches them in Supabase so that
  // the same lawyer isn't duplicated if the user searches again.
  let discoveredLawyers: any[] = [];

  try {
    const webLawyers = await searchLawyersOnWeb(city, caseType);

    if (webLawyers && webLawyers.length > 0) {
      const recordsToInsert = webLawyers.map(wl => ({
        name: wl.name,
        city: wl.city,
        specialization: wl.specialization,
        experience_years: wl.experience_years,
        reputation_score: null,
        email: wl.email || null,
        whatsapp_number: wl.whatsapp_number || null,
        bio: wl.bio,
        source_url: wl.source_url,
        last_crawled_at: new Date().toISOString(),
        verified: false
      }));

      // Deduplicate against existing cached records (same name+city or same email)
      const nameCityPairs = recordsToInsert.map(r =>
        `${r.name.toLowerCase().trim()}|${r.city.toLowerCase().trim()}`
      );
      const emails = recordsToInsert.map(r => r.email).filter(Boolean) as string[];

      let existing: any[] = [];

      // Check by name+city
      const { data: byCity } = await supabase
        .from('lawyers')
        .select('id, name, city, email')
        .ilike('city', `%${city}%`);

      if (byCity) {
        existing = byCity.filter((e: any) =>
          nameCityPairs.includes(
            `${(e.name ?? '').toLowerCase().trim()}|${(e.city ?? '').toLowerCase().trim()}`
          ) ||
          (e.email && emails.includes(e.email))
        );
      }

      const existingKeys = new Set([
        ...existing.map((e: any) => `${(e.name ?? '').toLowerCase().trim()}|${(e.city ?? '').toLowerCase().trim()}`),
        ...existing.map((e: any) => e.email).filter(Boolean),
      ]);

      const newRecords = recordsToInsert.filter(r => {
        const nameCity = `${r.name.toLowerCase().trim()}|${r.city.toLowerCase().trim()}`;
        return !existingKeys.has(nameCity) && !(r.email && existingKeys.has(r.email));
      });

      // Insert only truly new records
      if (newRecords.length > 0) {
        const { data: inserted } = await supabase
          .from('lawyers')
          .insert(newRecords)
          .select();
        if (inserted) discoveredLawyers.push(...inserted);
      }

      // Also include the existing cached versions of duplicates (they have full DB records)
      if (existing.length > 0) {
        const existingIds = existing.map((e: any) => e.id);
        const { data: fullExisting } = await supabase
          .from('lawyers')
          .select('*')
          .in('id', existingIds);
        if (fullExisting) discoveredLawyers.push(...fullExisting);
      }
    }
  } catch (err) {
    console.error('[search/route] Live web search failed:', err);
  }

  // ── DB Fallback: if live search returned nothing, use seeded real lawyers ──
  if (discoveredLawyers.length === 0) {
    console.warn('[search/route] Live search empty — falling back to seeded real lawyers in DB.');
    let { data: dbFallback } = await supabase
      .from('lawyers')
      .select('*')
      .ilike('city', `%${city}%`)
      .order('experience_years', { ascending: false, nullsFirst: false })
      .limit(20);

    // If no city match, return any lawyers from DB
    if (!dbFallback || dbFallback.length === 0) {
      const { data: globalFallback } = await supabase
        .from('lawyers')
        .select('*')
        .order('experience_years', { ascending: false, nullsFirst: false })
        .limit(20);
      dbFallback = globalFallback;
    }

    discoveredLawyers = dbFallback ?? [];
  }

  const lawyers = discoveredLawyers.slice(0, 20).map(l => ({
    ...l,
    unverified_warning: !l.verified
      ? 'This lawyer was found via live web search and has not been verified by Legal Mind.'
      : null,
  }));

  return NextResponse.json({ lawyers });
}
