// TASK 5 — POST /api/lawyers/generate-message
// Input: { caseId }
// Pulls safe_to_share fields from event_logs and drafts an outreach message via Gemini.
// NEVER includes do_not_share fields.

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase';
import { draftOutreachMessage } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const accessToken = auth.replace('Bearer ', '').trim();
  if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAnonClient(accessToken);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { caseId?: string; lawyerName?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { caseId, lawyerName } = body;
  if (!caseId) return NextResponse.json({ error: 'caseId is required' }, { status: 400 });

  // Verify case ownership and fetch case details
  const { data: caseData, error: caseErr } = await supabase
    .from('cases')
    .select('id, title, case_type')
    .eq('id', caseId)
    .eq('user_id', user.id)
    .single();

  if (caseErr || !caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  // Aggregate safe_to_share from all event_logs for this case
  const { data: logs } = await supabase
    .from('event_logs')
    .select('safe_to_share')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });

  // Merge all safe_to_share objects (newer entries override older ones)
  const safeToShare: Record<string, string> = {};
  for (const log of logs ?? []) {
    Object.assign(safeToShare, log.safe_to_share ?? {});
  }

  if (Object.keys(safeToShare).length === 0) {
    return NextResponse.json({
      error: 'No safe information available yet. Continue the consultation first.',
    }, { status: 422 });
  }

  let draft: string;
  try {
    draft = await draftOutreachMessage(
      caseData.title,
      caseData.case_type ?? 'General',
      safeToShare,
      lawyerName ?? undefined,
    );
  } catch (e) {
    console.error('[generate-message]', e);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
  }

  return NextResponse.json({ draft });
}
