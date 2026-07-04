// TASK 1 — Gmail OAuth: callback (GET /api/auth/gmail/callback)
// Google redirects here after the user consents.
// Exchanges the code for a refresh token, encrypts it, and saves it to profiles.

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/gmail';
import { encrypt } from '@/lib/crypto';
import { supabaseAdmin } from '@/lib/supabase';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  if (errorParam) {
    return NextResponse.redirect(`${APP_URL}?gmail_error=${encodeURIComponent(errorParam)}`);
  }

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  // Decode state to get userId
  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    userId = decoded.userId;
  } catch {
    return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 });
  }

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code);
  const refreshToken = tokens.refresh_token;

  if (!refreshToken) {
    // This happens if the user already authorized before and consent was reused.
    // In production: prompt=consent ensures we always get one.
    return NextResponse.redirect(`${APP_URL}?gmail_error=no_refresh_token`);
  }

  // Encrypt the refresh token before storing
  const encrypted = encrypt(refreshToken);

  // Upsert into profiles (admin client bypasses RLS to write the token)
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ gmail_refresh_token_enc: encrypted })
    .eq('id', userId);

  if (error) {
    console.error('[gmail/callback] Failed to save token:', error);
    return NextResponse.redirect(`${APP_URL}?gmail_error=save_failed`);
  }

  // Redirect back to the app with success flag
  return NextResponse.redirect(`${APP_URL}?gmail_connected=true`);
}
