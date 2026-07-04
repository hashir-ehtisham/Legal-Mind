// TASK 3b — GET /api/cases/[id]
// Returns a single case with full message history and event_logs.

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = req.headers.get('authorization') ?? '';
  const accessToken = auth.replace('Bearer ', '').trim();
  if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAnonClient(accessToken);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const caseId = params.id;

  // Fetch the case (RLS ensures ownership)
  const { data: caseData, error: caseErr } = await supabase
    .from('cases')
    .select('id, title, case_type, status, created_at, updated_at')
    .eq('id', caseId)
    .eq('user_id', user.id)
    .single();

  if (caseErr || !caseData) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  // Fetch messages
  const { data: messages } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });

  // Fetch event logs (safe_to_share only — do_not_share stays server-side)
  const { data: eventLogs } = await supabase
    .from('event_logs')
    .select('id, summary, safe_to_share, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    case: caseData,
    messages: messages ?? [],
    event_logs: eventLogs ?? [],
  });
}
