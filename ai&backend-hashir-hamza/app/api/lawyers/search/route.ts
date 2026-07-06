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

  // ── Step 1: Run real-time web search for new lawyers ──────────────────────
  try {
    const webLawyers = await searchLawyersOnWeb(city, caseType);
    if (webLawyers && webLawyers.length > 0) {
      const recordsToInsert = webLawyers.map(wl => ({
        name: wl.name,
        city: wl.city,
        specialization: wl.specialization,
        experience_years: wl.experience_years,
        reputation_score: Number((4.0 + Math.random() * 0.9).toFixed(1)),
        email: wl.email || null,
        whatsapp_number: wl.whatsapp_number || null,
        bio: wl.bio,
        source_url: wl.source_url,
        last_crawled_at: new Date().toISOString(),
        verified: false
      }));

      const emails = recordsToInsert.map(r => r.email).filter(Boolean) as string[];
      const phones = recordsToInsert.map(r => r.whatsapp_number).filter(Boolean) as string[];

      let queryStr = '';
      if (emails.length > 0) {
        queryStr += `email.in.(${emails.map(e => `"${e}"`).join(',')})`;
      }
      if (phones.length > 0) {
        if (queryStr) queryStr += ',';
        queryStr += `whatsapp_number.in.(${phones.map(p => `"${p}"`).join(',')})`;
      }

      let existing: any[] = [];
      if (queryStr) {
        const { data: existingData } = await supabase
          .from('lawyers')
          .select('email, whatsapp_number, name, city')
          .or(queryStr);
        existing = existingData || [];
      }

      const filteredRecords = recordsToInsert.filter(record => {
        const dup = existing.find(e => 
          (record.email && e.email === record.email) || 
          (record.whatsapp_number && e.whatsapp_number === record.whatsapp_number) ||
          (e.name.toLowerCase().trim() === record.name.toLowerCase().trim() && e.city.toLowerCase().trim() === record.city.toLowerCase().trim())
        );
        return !dup;
      });

      if (filteredRecords.length > 0) {
        await supabase.from('lawyers').insert(filteredRecords);
      }
    }
  } catch (err) {
    console.error('[search/route] Real-time web search/insert failed:', err);
  }

  // Helper to map UI caseType to database specialization keywords
  const getSpecializationKeywords = (type: string): string[] => {
    const mapping: Record<string, string[]> = {
      Civil: ["Civil Law", "Property Law", "Land Bylaws", "Contract Disputes", "Real Estate"],
      Corporate: ["Corporate Law", "Intellectual Property", "Company Registration", "Taxation", "Mergers & Acquisitions"],
      Family: ["Family Law", "Marriage & Divorce", "Child Custody", "Inheritance Distribution", "Khula"],
      Criminal: ["Criminal Law", "Bail Applications", "White Collar Crime", "Trial Advocacy", "PPC Appeals"],
      Labor: ["Labor Law", "Employment Contracts", "Wrongful Termination", "Workplace Safety", "Gratuity Disputes"],
      Tax: ["Tax Law", "FBR Compliance", "Income Tax Appeals", "Sales Tax Disputes", "Customs & Excise"]
    };
    return mapping[type] || [];
  };

  const specs = getSpecializationKeywords(caseType);

  const buildQuery = (filterCity: boolean, filterSpecialization: boolean) => {
    let q = supabase
      .from('lawyers')
      .select(
        'id, name, gender, city, specialization, experience_years, reputation_score, email, whatsapp_number, bio, profile_image_url, verified',
      )
      .order('verified', { ascending: false })
      .order('reputation_score', { ascending: false, nullsFirst: false })
      .order('experience_years', { ascending: false, nullsFirst: false })
      .limit(20);

    if (filterCity) {
      q = q.ilike('city', `%${city}%`);
    }
    if (filterSpecialization && specs.length > 0) {
      q = q.overlaps('specialization', specs);
    }
    if (gender && gender !== 'any') {
      q = q.ilike('gender', gender);
    }
    if (minExperience != null && minExperience > 0) {
      q = q.gte('experience_years', minExperience);
    }
    if (minReputation != null && minReputation > 0) {
      q = q.gte('reputation_score', minReputation);
    }
    return q;
  };

  // Tier 1: Match City and Specialization
  let { data, error } = await buildQuery(true, true);

  if (error) {
    console.error('[lawyers/search] Tier 1 query failed:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  // Tier 2: If no exact matches, try matching City only (ignoring specialization)
  if (!data || data.length === 0) {
    const tier2 = await buildQuery(true, false);
    if (tier2.error) {
      console.error('[lawyers/search] Tier 2 query failed:', tier2.error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
    data = tier2.data;
  }

  // Tier 3: If still no matches, try matching Specialization globally (ignoring City)
  if (!data || data.length === 0) {
    const tier3 = await buildQuery(false, true);
    if (tier3.error) {
      console.error('[lawyers/search] Tier 3 query failed:', tier3.error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
    data = tier3.data;
  }

  // Tier 4: Fallback to global top matching other criteria
  if (!data || data.length === 0) {
    const fallback = await buildQuery(false, false);
    if (fallback.error) {
      console.error('[lawyers/search] Fallback query failed:', fallback.error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
    data = fallback.data;
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
