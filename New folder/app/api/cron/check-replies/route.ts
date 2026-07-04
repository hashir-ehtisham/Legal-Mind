// TASK 7 — GET /api/cron/check-replies  (Vercel Cron — daily)
// Secured: only Vercel's cron job can call this (checks CRON_SECRET header).
//
// For every case_lawyers row with status='message_sent' and contacted_at
// within the last 48 hours, checks the user's Gmail for a reply from that
// lawyer. If found: marks 'replied'. Once >= 2 replies on a case, Gemini
// ranks them and marks top 2 as 'suggested'. Sends user a notification email.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkForReply } from '@/lib/gmail';
import { rankLawyerReplies } from '@/lib/gemini';
import { decrypt } from '@/lib/crypto';
import { sendEmail } from '@/lib/gmail';

export async function GET(req: NextRequest) {
  // ── Security: Verify cron secret header ──────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const incoming = req.headers.get('x-cron-secret');
  if (!cronSecret || incoming !== cronSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

  // Fetch all pending contacts within the window
  const { data: pendingContacts, error } = await supabaseAdmin
    .from('case_lawyers')
    .select(`
      id,
      case_id,
      lawyer_id,
      contacted_at,
      channel,
      cases!inner ( user_id, title ),
      lawyers!inner ( name, email )
    `)
    .eq('status', 'message_sent')
    .eq('channel', 'email')  // only email contacts can have auto-reply detection
    .gte('contacted_at', cutoff.toISOString());

  if (error) {
    console.error('[check-replies] fetch failed:', error);
    return NextResponse.json({ error: 'DB query failed' }, { status: 500 });
  }

  const processed: string[] = [];
  const caseReplyCount: Record<string, { lawyerId: string; name: string; snippet: string }[]> = {};

  for (const contact of pendingContacts ?? []) {
    const caseRow = contact.cases as unknown as { user_id: string; title: string };
    const lawyerRow = contact.lawyers as unknown as { name: string; email: string };

    if (!lawyerRow.email) continue;

    // Get user's Gmail refresh token
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('gmail_refresh_token_enc')
      .eq('id', caseRow.user_id)
      .single();

    if (!profile?.gmail_refresh_token_enc) continue;

    let refreshToken: string;
    try { refreshToken = decrypt(profile.gmail_refresh_token_enc); }
    catch { continue; }

    // Check Gmail for a reply from this lawyer
    let replyResult;
    try {
      replyResult = await checkForReply(
        refreshToken,
        lawyerRow.email,
        new Date(contact.contacted_at),
      );
    } catch (e) {
      console.error(`[check-replies] Gmail check failed for contact ${contact.id}:`, e);
      continue;
    }

    if (!replyResult.found) continue;

    // Mark as replied
    await supabaseAdmin
      .from('case_lawyers')
      .update({
        status: 'replied',
        replied_at: new Date().toISOString(),
        reply_summary: replyResult.snippet ?? '',
      })
      .eq('id', contact.id);

    processed.push(contact.id);

    // Collect replies per case for ranking
    if (!caseReplyCount[contact.case_id]) caseReplyCount[contact.case_id] = [];
    caseReplyCount[contact.case_id].push({
      lawyerId: contact.lawyer_id,
      name: lawyerRow.name,
      snippet: replyResult.snippet ?? '',
    });
  }

  // ── Rank and suggest once >= 2 replies on a case ─────────────────────────
  for (const [caseId, replies] of Object.entries(caseReplyCount)) {
    // Count total replied lawyers for this case
    const { data: allReplied } = await supabaseAdmin
      .from('case_lawyers')
      .select('id, lawyer_id, reply_summary, lawyers!inner(name)')
      .eq('case_id', caseId)
      .eq('status', 'replied');

    if (!allReplied || allReplied.length < 2) continue;

    // Rank via Gemini
    const toRank = allReplied.map(r => ({
      lawyerId: r.lawyer_id,
      name: (r.lawyers as unknown as { name: string }).name,
      replyText: r.reply_summary ?? '',
    }));

    let ranked;
    try { ranked = await rankLawyerReplies(toRank); }
    catch (e) { console.error('[check-replies] ranking failed:', e); continue; }

    // Mark top 2 as 'suggested'
    const top2 = ranked.sort((a, b) => a.rank - b.rank).slice(0, 2);
    for (const suggestion of top2) {
      await supabaseAdmin
        .from('case_lawyers')
        .update({
          status: 'suggested',
          suggested_reasoning: suggestion.reasoning,
        })
        .eq('case_id', caseId)
        .eq('lawyer_id', suggestion.lawyerId);
    }

    // Notify user by email
    const { data: caseData } = await supabaseAdmin
      .from('cases')
      .select('user_id, title')
      .eq('id', caseId)
      .single();

    if (caseData) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('gmail_refresh_token_enc, full_name')
        .eq('id', caseData.user_id)
        .single();

      if (profile?.gmail_refresh_token_enc) {
        try {
          const rt = decrypt(profile.gmail_refresh_token_enc);
          // Get user's own email from auth
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(caseData.user_id);
          const userEmail = userData?.user?.email;
          if (userEmail) {
            const topNames = top2.map(t => toRank.find(r => r.lawyerId === t.lawyerId)?.name ?? '').join(' and ');
            await sendEmail({
              refreshToken: rt,
              to: userEmail,
              subject: `Good news — Lawyer replies received for "${caseData.title}"`,
              body:
                `Dear ${profile.full_name ?? 'Valued Client'},\n\n` +
                `Great news! We've received replies from lawyers regarding your case "${caseData.title}".\n\n` +
                `Based on empathy, clarity, and stated experience, we suggest you consider: ${topNames}.\n\n` +
                `Log in to Legal Mind to review all replies and make your selection.\n\n` +
                `— The Legal Mind Team`,
            });
          }
        } catch (e) { console.error('[check-replies] notification email failed:', e); }
      }
    }
  }

  return NextResponse.json({ processed: processed.length, suggested: Object.keys(caseReplyCount).length });
}
