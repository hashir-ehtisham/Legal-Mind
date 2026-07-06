// TASK 3a — GET /api/cases
// Returns the authenticated user's cases, newest first.

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const accessToken = auth.replace('Bearer ', '').trim();
  if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAnonClient(accessToken);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('cases')
    .select('id, title, case_type, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[cases GET]', error);
    return NextResponse.json({ error: 'Failed to fetch cases' }, { status: 500 });
  }

  return NextResponse.json({ cases: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const accessToken = auth.replace('Bearer ', '').trim();
  if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAnonClient(accessToken);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { title?: string; caseType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title, caseType } = body;
  if (!title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('cases')
    .insert({
      user_id: user.id,
      title: title.trim(),
      case_type: caseType || 'AI',
      status: 'active'
    })
    .select('id, title, case_type, status, created_at')
    .single();

  if (error) {
    console.error('[cases POST]', error);
    return NextResponse.json({ error: 'Failed to create case' }, { status: 500 });
  }

  return NextResponse.json({ case: data });
}

