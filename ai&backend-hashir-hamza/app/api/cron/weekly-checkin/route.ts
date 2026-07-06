// TASK 9 — GET /api/cron/weekly-checkin  (Vercel Cron — every Monday)
// For every case with status 'active' or 'in_progress', sends a personalised
// Gmail check-in email to the case owner.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCheckinEmail } from '@/lib/gemini';
import { sendEmail } from '@/lib/gmail';
import { decrypt } from '@/lib/crypto';

export async function GET(req: NextRequest) {
  // ── Security ──────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const incoming = req.headers.get('x-cron-secret');
  if (!cronSecret || incoming !== cronSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all active / in_progress cases
  const { data: cases, error } = await supabaseAdmin
    .from('cases')
    .select('id, user_id, title, status')
    .in('status', ['active', 'in_progress']);

  if (error) {
    console.error('[weekly-checkin] fetch failed:', error);
    return NextResponse.json({ error: 'DB query failed' }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const c of cases ?? []) {
    // Get user profile + refresh token
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, gmail_refresh_token_enc')
      .eq('id', c.user_id)
      .single();

    if (!profile?.gmail_refresh_token_enc) { skipped++; continue; }

    // Get user's email from Supabase Auth
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(c.user_id);
    const userEmail = userData?.user?.email;
    if (!userEmail) { skipped++; continue; }

    let refreshToken: string;
    try { refreshToken = decrypt(profile.gmail_refresh_token_enc); }
    catch { skipped++; continue; }

    // Generate personalised check-in body
    let body: string;
    try {
      body = await generateCheckinEmail(profile.full_name ?? 'Valued Client', c.title);
    } catch {
      body = `Dear ${profile.full_name ?? 'Valued Client'},\n\nWe wanted to check in on your case "${c.title}". If you have any updates or questions, please don't hesitate to reply.\n\n— The Legal Mind Team`;
    }

    // Send the email
    try {
      await sendEmail({
        refreshToken,
        to: userEmail,
        subject: `Weekly Update — Your Legal Mind Case: "${c.title}"`,
        body,
      });

      // Record the check-in
      await supabaseAdmin.from('weekly_checkins').insert({ case_id: c.id });
      sent++;
    } catch (e) {
      console.error(`[weekly-checkin] Send failed for case ${c.id}:`, e);
      skipped++;
    }
  }

  return NextResponse.json({ sent, skipped });
}
