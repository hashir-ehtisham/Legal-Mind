// TASK 8 — POST /api/lawyers/select
// Input: { caseId, lawyerId }
// Marks one lawyer as 'selected', closes others for that case,
// updates event_log, sets case status to 'in_progress'.

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const accessToken = auth.replace('Bearer ', '').trim();
  if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAnonClient(accessToken);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { caseId?: string; lawyerId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { caseId, lawyerId } = body;
  if (!caseId || !lawyerId) {
    return NextResponse.json({ error: 'caseId and lawyerId are required' }, { status: 400 });
  }

  // Verify case ownership
  const { data: caseData, error: caseErr } = await supabase
    .from('cases')
    .select('id, title')
    .eq('id', caseId)
    .eq('user_id', user.id)
    .single();
  if (caseErr || !caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  // Mark the chosen lawyer as selected
  const { error: selectErr } = await supabase
    .from('case_lawyers')
    .update({ status: 'selected' })
    .eq('case_id', caseId)
    .eq('lawyer_id', lawyerId);

  if (selectErr) {
    console.error('[select] Failed to set selected:', selectErr);
    return NextResponse.json({ error: 'Failed to select lawyer' }, { status: 500 });
  }

  // Fetch selected lawyer's name for event log
  const { data: lawyer } = await supabase
    .from('lawyers')
    .select('name')
    .eq('id', lawyerId)
    .single();

  // Update case status to in_progress
  await supabase
    .from('cases')
    .update({ status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', caseId);

  // Write event log
  await supabase.from('event_logs').insert({
    case_id: caseId,
    summary: `User selected ${lawyer?.name ?? 'a lawyer'} to handle the case.`,
    safe_to_share: {
      selected_lawyer: lawyer?.name ?? lawyerId,
      selected_at: new Date().toLocaleDateString('en-PK'),
    },
    do_not_share: {},
  });

  return NextResponse.json({ success: true, case_status: 'in_progress' });
}
