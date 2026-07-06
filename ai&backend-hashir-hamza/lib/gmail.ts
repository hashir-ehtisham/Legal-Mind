import { google } from 'googleapis';
import { decrypt } from './crypto';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID!;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI!;

export function getOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

/**
 * Build an authenticated OAuth2 client for a specific user's refresh token.
 * The token is stored encrypted in the DB; pass the decrypted value here.
 */
export function getAuthedClient(refreshToken: string) {
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

/**
 * Generate the Google OAuth URL requesting Gmail scopes.
 */
export function getGmailAuthUrl(state: string): string {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // force consent to always get a refresh_token
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
    ],
    state,
  });
}

/**
 * Exchange an auth code for tokens.
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  return tokens;
}

// ─── Send Email ───────────────────────────────────────────────────────────────
export interface EmailOptions {
  refreshToken: string; // decrypted
  to: string;
  subject: string;
  body: string; // plain text
}

function makeRawEmail(to: string, subject: string, body: string): string {
  const email = [
    `To: ${to}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body,
  ].join('\n');
  return Buffer.from(email).toString('base64url');
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  const auth = getAuthedClient(opts.refreshToken);
  const gmail = google.gmail({ version: 'v1', auth });
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: makeRawEmail(opts.to, opts.subject, opts.body) },
  });
}

// ─── Check for Replies ────────────────────────────────────────────────────────
export interface ReplyResult {
  found: boolean;
  snippet?: string;
  messageId?: string;
}

/**
 * Check if a reply from `fromEmail` arrived after `afterDate`.
 */
export async function checkForReply(
  refreshToken: string,
  fromEmail: string,
  afterDate: Date,
): Promise<ReplyResult> {
  const auth = getAuthedClient(refreshToken);
  const gmail = google.gmail({ version: 'v1', auth });

  const afterEpoch = Math.floor(afterDate.getTime() / 1000);
  const query = `from:${fromEmail} after:${afterEpoch}`;

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 1,
  });

  const messages = listRes.data.messages ?? [];
  if (messages.length === 0) return { found: false };

  const msgRes = await gmail.users.messages.get({
    userId: 'me',
    id: messages[0].id!,
    format: 'metadata',
    metadataHeaders: ['From', 'Subject'],
  });

  return {
    found: true,
    snippet: msgRes.data.snippet ?? '',
    messageId: messages[0].id!,
  };
}
