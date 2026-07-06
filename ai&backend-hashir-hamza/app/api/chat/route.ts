// TASK 2 — Main Chat Endpoint: POST /api/chat
// Input: { caseId: string | null, message: string }
// Full pipeline: classify → (panic or RAG) → save → respond

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient, supabaseAdmin } from '@/lib/supabase';
import {
  classifyMessage,
  getEmbedding,
  generateLegalResponse,
} from '@/lib/gemini';

function getAccessToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace('Bearer ', '').trim();
  return token || null;
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAnonClient(accessToken);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { caseId?: string | null; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { caseId: inputCaseId, message } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  // ── Step 1: Create case if caseId is null ─────────────────────────────────
  let caseId = inputCaseId ?? null;

  if (!caseId) {
    const { data: newCase, error: caseErr } = await supabase
      .from('cases')
      .insert({
        user_id: user.id,
        title: message.slice(0, 80), // auto-title from first message
        status: 'active',
      })
      .select('id')
      .single();

    if (caseErr || !newCase) {
      console.error('[chat] Case creation failed:', caseErr);
      return NextResponse.json({ error: 'Failed to create case' }, { status: 500 });
    }
    caseId = newCase.id;
  } else {
    // Verify the case belongs to this user
    const { data: existing, error: fetchErr } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }
  }

  // ── Step 2: Save user message ─────────────────────────────────────────────
  await supabase.from('messages').insert({
    case_id: caseId,
    role: 'user',
    content: message,
  });

  // ── Step 3: Classify ──────────────────────────────────────────────────────
  let classification;
  try {
    classification = await classifyMessage(message);
  } catch (e) {
    console.error('[chat] Classification failed:', e);
    return NextResponse.json({ error: 'AI service error' }, { status: 502 });
  }

  // ── Step 4: Panic path ────────────────────────────────────────────────────
  if (!classification.is_case) {
    const panicResponse =
      `It sounds like you're going through something really difficult, and it's completely understandable to feel overwhelmed. ` +
      `I want you to know that your feelings are valid. ` +
      `While this may not be a legal matter right now, please know that support is available. ` +
      `Take a breath — you don't have to figure everything out at once. ` +
      `If at any point this becomes a legal situation, I'm here to help guide you.`;

    await supabase.from('messages').insert({
      case_id: caseId,
      role: 'assistant',
      content: panicResponse,
    });

    await supabase.from('cases').update({ status: 'panic' }).eq('id', caseId);

    return NextResponse.json({
      caseId,
      response: panicResponse,
      is_case: false,
      showFindLawyerCTA: false,
    });
  }

  // ── Step 5a: Embed the user message ───────────────────────────────────────
  let embedding: number[];
  try {
    embedding = await getEmbedding(message);
  } catch (e) {
    console.error('[chat] Embedding failed:', e);
    return NextResponse.json({ error: 'Embedding service error' }, { status: 502 });
  }

  // ── Step 5b: RAG — retrieve top 5 legal chunks ───────────────────────────
  const { data: chunks, error: rpcErr } = await supabaseAdmin.rpc(
    'match_legal_chunks',
    { query_embedding: embedding, match_count: 5 },
  );

  if (rpcErr) {
    console.error('[chat] match_legal_chunks RPC failed:', rpcErr);
    return NextResponse.json({ error: 'Vector search error' }, { status: 500 });
  }

  // ── Step 5c: Fetch conversation history for context ───────────────────────
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })
    .limit(20);

  // ── Step 5c: Build RAG response ───────────────────────────────────────────
  let ragResult;
  try {
    ragResult = await generateLegalResponse(
      message,
      classification.case_type ?? 'General',
      chunks ?? [],
      history ?? [],
    );
  } catch (e) {
    console.error('[chat] RAG generation failed:', e);
    return NextResponse.json({ error: 'AI generation error' }, { status: 502 });
  }

  // ── Step 5d & e: Save assistant message and event_log ────────────────────
  await supabase.from('messages').insert({
    case_id: caseId,
    role: 'assistant',
    content: ragResult.response,
  });

  await supabase.from('event_logs').insert({
    case_id: caseId,
    summary: ragResult.event_log.summary,
    safe_to_share: ragResult.event_log.safe_to_share,
    do_not_share: ragResult.event_log.do_not_share,
  });

  // Update case type and status
  await supabase
    .from('cases')
    .update({
      case_type: classification.case_type,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', caseId);

  // ── Step 5f: Return ───────────────────────────────────────────────────────
  return NextResponse.json({
    caseId,
    response: ragResult.response,
    is_case: true,
    case_type: classification.case_type,
    showFindLawyerCTA: true,
  });
}
