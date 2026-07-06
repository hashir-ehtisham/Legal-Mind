// TASK 6 — POST /api/lawyers/contact
// Input: { caseId, lawyerId, finalMessage, channel: "email"|"whatsapp"|"call" }
// Saves the message, upserts case_lawyers, sends email if channel === "email".

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient, supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/gmail';
import { decrypt } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const accessToken = auth.replace('Bearer ', '').trim();
  if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAnonClient(accessToken);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { caseId?: string; lawyerId?: string; finalMessage?: string; channel?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { caseId, lawyerId, finalMessage, channel } = body;
  if (!caseId || !lawyerId || !finalMessage || !channel) {
    return NextResponse.json({ error: 'caseId, lawyerId, finalMessage, and channel are required' }, { status: 400 });
  }
  if (!['email', 'whatsapp', 'call'].includes(channel)) {
    return NextResponse.json({ error: 'channel must be email, whatsapp, or call' }, { status: 400 });
  }

  // Verify case ownership
  const { data: caseData, error: caseErr } = await supabase
    .from('cases')
    .select('id, title')
    .eq('id', caseId)
    .eq('user_id', user.id)
    .single();
  if (caseErr || !caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  // Fetch lawyer details
  const { data: lawyer, error: lawyerErr } = await supabase
    .from('lawyers')
    .select('id, name, email, whatsapp_number')
    .eq('id', lawyerId)
    .single();
  if (lawyerErr || !lawyer) return NextResponse.json({ error: 'Lawyer not found' }, { status: 404 });

  const contactedAt = new Date().toISOString();

  // Upsert case_lawyers record
  const { error: upsertErr } = await supabase
    .from('case_lawyers')
    .upsert({
      case_id: caseId,
      lawyer_id: lawyerId,
      status: 'message_sent',
      message_sent: finalMessage,
      contacted_at: contactedAt,
      channel,
    }, { onConflict: 'case_id,lawyer_id' });

  if (upsertErr) {
    console.error('[contact] upsert failed:', upsertErr);
    return NextResponse.json({ error: 'Failed to save contact record' }, { status: 500 });
  }

  // If email, send via Gmail
  let emailSent = false;
  let emailError: string | null = null;

  if (channel === 'email') {
    if (!lawyer.email) {
      emailError = 'Lawyer has no email address on file';
    } else {
      // Fetch user's encrypted refresh token
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('gmail_refresh_token_enc')
        .eq('id', user.id)
        .single();

      if (!profile?.gmail_refresh_token_enc) {
        emailError = 'Gmail not connected. Please authorize Gmail access first via /api/auth/gmail';
      } else {
        try {
          const refreshToken = decrypt(profile.gmail_refresh_token_enc);
          await sendEmail({
            refreshToken,
            to: lawyer.email,
            subject: `Legal Assistance Inquiry — ${caseData.title}`,
            body: finalMessage,
          });
          emailSent = true;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error('[contact] Gmail send failed:', msg);
          emailError = `Email send failed: ${msg}`;
        }
      }
    }
  }

  // Update event_log to record this contact
  await supabase.from('event_logs').insert({
    case_id: caseId,
    summary: `Contacted lawyer ${lawyer.name} via ${channel} on ${new Date().toLocaleDateString('en-PK')}`,
    safe_to_share: {
      lawyer_name: lawyer.name,
      channel,
      contacted_at: contactedAt,
    },
    do_not_share: {
      message_body: finalMessage,
    },
  });

  // Return what the client needs for whatsapp / call fallback links
  return NextResponse.json({
    success: true,
    channel,
    emailSent,
    emailError,
    // Frontend uses these to open wa.me or tel: links for whatsapp/call
    whatsappUrl: lawyer.whatsapp_number
      ? `https://wa.me/${lawyer.whatsapp_number.replace(/\D/g, '')}`
      : null,
    phoneNumber: lawyer.whatsapp_number ?? null,
  });
}
