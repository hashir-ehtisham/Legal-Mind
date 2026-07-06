// TASK 1 — Gmail OAuth: initiation (GET /api/auth/gmail)
// Redirects the logged-in user to Google's consent screen.
// Requires the user to already be authenticated via Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { getGmailAuthUrl } from '@/lib/gmail';
import { createAnonClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  // Verify the user is logged in via Supabase
  const authHeader = req.headers.get('authorization') ?? '';
  const accessToken = authHeader.replace('Bearer ', '');

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized — log in first' }, { status: 401 });
  }

  const supabase = createAnonClient(accessToken);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Encode the user's Supabase ID as state so the callback knows who to update
  const state = Buffer.from(JSON.stringify({ userId: user.id, accessToken })).toString('base64url');
  const url = getGmailAuthUrl(state);

  return NextResponse.redirect(url);
}
