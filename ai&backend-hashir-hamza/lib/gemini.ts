import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) console.warn('[gemini] GEMINI_API_KEY is not set.');

export const ai = new GoogleGenAI({ apiKey: apiKey ?? '' });

// ─── Embedding ────────────────────────────────────────────────────────────────
// Uses the same model as the ingestion script (gemini-embedding-001, 768-dim)
// so RAG vectors are comparable.
export async function getEmbedding(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: { outputDimensionality: 768 },
  });
  const values = response?.embeddings?.[0]?.values;
  if (!values) throw new Error('No embedding values returned');
  return values;
}

// ─── Classification ───────────────────────────────────────────────────────────
export interface ClassifyResult {
  is_case: boolean;
  case_type: string | null;
  reasoning: string;
}

/**
 * Classify whether a user message represents a real legal case or is
 * emotional venting / panic with no actionable legal issue.
 */
export async function classifyMessage(message: string): Promise<ClassifyResult> {
  const prompt = `You are a legal triage expert for Pakistan. Analyze the following user message and determine whether it describes a genuine legal issue that a lawyer could help with, or whether it is primarily emotional venting, panic, or a non-legal problem.

Respond with ONLY a valid JSON object — no markdown, no explanation outside the JSON:
{
  "is_case": <boolean — true if this is a real legal issue>,
  "case_type": <string | null — one of: "Civil", "Family", "Corporate", "Criminal", "Labor", "Tax", or null if is_case is false>,
  "reasoning": <string — one sentence explaining your decision>
}

User message:
"""
${message}
"""`;

  const response = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  const raw = response.text ?? '{}';
  try {
    return JSON.parse(raw) as ClassifyResult;
  } catch {
    // Fallback if model doesn't return pure JSON
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as ClassifyResult;
    throw new Error(`Failed to parse classify response: ${raw}`);
  }
}

// ─── RAG Response ─────────────────────────────────────────────────────────────
export interface RagResult {
  response: string;
  event_log: {
    summary: string;
    safe_to_share: Record<string, string>;
    do_not_share: Record<string, string>;
  };
}

/**
 * Generate a RAG-grounded legal response plus a structured event_log.
 * Only uses information from the retrieved legal chunks — never invents citations.
 */
export async function generateLegalResponse(
  userMessage: string,
  caseType: string,
  chunks: Array<{ content: string; metadata: Record<string, unknown> }>,
  conversationHistory: Array<{ role: string; content: string }>,
): Promise<RagResult> {
  const context = chunks
    .map((c, i) => `[Excerpt ${i + 1}]\n${c.content}`)
    .join('\n\n');

  const historyText = conversationHistory
    .slice(-6) // last 3 turns
    .map(m => `${m.role === 'user' ? 'User' : 'Legal Guide'}: ${m.content}`)
    .join('\n');

  const prompt = `You are a calm, knowledgeable Pakistani legal guide. You are helping a citizen understand their legal situation.

STRICT RULES:
1. Base your response ONLY on the provided legal excerpts below. Do not invent case citations, section numbers, or legal rules that are not in the excerpts.
2. If the excerpts do not cover the user's question, say so honestly and suggest they consult a qualified advocate.
3. Be reassuring, clear, and use simple language. This person may be distressed.
4. At the end, generate a JSON event_log following the schema below.

--- RELEVANT LEGAL EXCERPTS ---
${context}

--- CONVERSATION SO FAR ---
${historyText}

--- CURRENT USER MESSAGE ---
${userMessage}

--- CASE TYPE ---
${caseType}

Respond in two parts separated by the exact marker "---EVENT_LOG_JSON---":

Part 1: Your helpful, empathetic response to the user (plain text, no JSON).

Part 2 (after the marker): A single JSON object with this exact shape:
{
  "summary": "<one sentence describing what happened in this message>",
  "safe_to_share": {
    "issue_type": "<brief description of legal issue>",
    "relevant_law": "<any specific law/act mentioned in excerpts, or 'not determined'>",
    "recommended_next_step": "<one actionable step>",
    "recommended_experience": "<one of exactly: '1-5', '5-10', or '10+' — minimum years of lawyer experience needed based on the complexity and severity of this case>"
  },
  "do_not_share": {
    "raw_message": "<the user's exact message — never share this with lawyers>",
    "sensitive_details": "<any CNIC numbers, full home address, family names — never share at first contact>"
  }
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: prompt,
  });

  const text = response.text ?? '';
  const [responsePart, jsonPart] = text.split('---EVENT_LOG_JSON---');

  let event_log: RagResult['event_log'] = {
    summary: 'User described their legal situation.',
    safe_to_share: { issue_type: caseType },
    do_not_share: { raw_message: userMessage },
  };

  if (jsonPart) {
    try {
      const match = jsonPart.match(/\{[\s\S]*\}/);
      if (match) event_log = JSON.parse(match[0]);
    } catch {
      // keep fallback
    }
  }

  return {
    response: (responsePart ?? text).trim(),
    event_log,
  };
}

// ─── Outreach Message Drafting ────────────────────────────────────────────────
export async function draftOutreachMessage(
  caseTitle: string,
  caseType: string,
  safeToShare: Record<string, string>,
  history: Array<{ role: string; content: string }>,
  lawyerName?: string,
): Promise<string> {
  const details = Object.entries(safeToShare)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const historyText = history
    .slice(-10) // last 5 turns
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const salutation = lawyerName ? `Dear ${lawyerName},` : 'Dear Advocate,';

  const prompt = `You are drafting a professional, polite, and completely English message from a Pakistani citizen to a lawyer asking for legal assistance.
Do not include any Urdu words or translations; the message must be written entirely in English.

Case Title: ${caseTitle}
Case Type: ${caseType}
Lawyer Name: ${lawyerName ?? 'Unknown'}

--- SHAREABLE LOG DETAILS ---
${details || 'No specific structured log details available.'}

--- CONVERSATION HISTORY ---
${historyText || 'No conversation history available.'}

IMPORTANT RULES:
1. The message MUST begin with exactly: "${salutation}" — use the lawyer's real name in the salutation, do not use placeholders like [Lawyer Name].
2. Write a polite, professional outreach message (150–250 words) from the user's perspective introducing themselves, explaining their issue based on the history and shareable details.
3. Keep the tone professional, sincere, and completely in English.
4. Do NOT include any highly sensitive personal identifiers (like CNIC numbers, full home addresses, bank accounts).
5. Sign off as "The Client".
`;

  const response = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: prompt,
  });

  return (response.text ?? '').trim();
}

// ─── Rank Lawyer Replies ──────────────────────────────────────────────────────
export interface RankedReply {
  lawyerId: string;
  rank: number;
  reasoning: string;
}

export async function rankLawyerReplies(
  replies: Array<{ lawyerId: string; name: string; replyText: string }>,
): Promise<RankedReply[]> {
  const formatted = replies
    .map(
      (r, i) =>
        `[Lawyer ${i + 1}] ID: ${r.lawyerId}, Name: ${r.name}\nReply: ${r.replyText}`,
    )
    .join('\n\n');

  const prompt = `You are evaluating lawyer replies to a Pakistani citizen seeking legal help. Rank ALL replies by: (1) empathy and warmth, (2) clarity of explanation, (3) stated relevant experience. 

${formatted}

Respond ONLY with a valid JSON array, no markdown:
[
  { "lawyerId": "<id>", "rank": <1=best>, "reasoning": "<one sentence>" },
  ...
]`;

  const response = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  const raw = response.text ?? '[]';
  try {
    return JSON.parse(raw) as RankedReply[];
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]) as RankedReply[];
    return [];
  }
}

// ─── Weekly check-in personalisation ─────────────────────────────────────────
export async function generateCheckinEmail(
  userName: string,
  caseTitle: string,
): Promise<string> {
  const prompt = `Write a short, warm weekly check-in email (80–120 words) from "Legal Mind" to a user named ${userName} about their case titled "${caseTitle}". Ask how the case is progressing, remind them we are here to help, and invite them to reply with any updates. Do not mention specific legal details. Sign off as "The Legal Mind Team".`;

  const response = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: prompt,
  });

  return (response.text ?? '').trim();
}

// ─── Real-Time Web Search Grounding ──────────────────────────────────────────
export interface GroundedLawyer {
  name: string;
  city: string;
  specialization: string[];
  experience_years: number;
  email: string | null;
  whatsapp_number: string | null;
  bio: string;
  source_url: string;
}

export async function searchLawyersOnWeb(
  city: string,
  caseType: string,
): Promise<GroundedLawyer[]> {
  const seed = Math.floor(Math.random() * 10000);

  // Resolve official bar council sites based on region/city
  let siteRestrictions = 'pakistanbarcouncil.com';
  const normalizedCity = city.toLowerCase().trim();
  if (['lahore', 'rawalpindi', 'faisalabad', 'multan', 'sialkot', 'gujranwala'].includes(normalizedCity)) {
    siteRestrictions = 'pbbarcouncil.com or pakistanbarcouncil.com';
  } else if (['karachi', 'hyderabad'].includes(normalizedCity)) {
    siteRestrictions = 'sindhbarcouncil.org or pakistanbarcouncil.com';
  } else if (normalizedCity === 'islamabad') {
    siteRestrictions = 'iba.org.pk or ibc.org.pk or ihcba.org.pk or pakistanbarcouncil.com';
  } else if (normalizedCity === 'peshawar') {
    siteRestrictions = 'kpbarcouncil.com or pakistanbarcouncil.com';
  }

  const sharedPrompt = `Find 6 to 8 real, active, practicing lawyers in ${city}, Pakistan who handle ${caseType} cases.
Prioritize profiles from these official bar council directories: ${siteRestrictions}.
(Search seed: ${seed} — find different lawyers each time if possible.)

CRITICAL RULES:
- Every entry must be a real individual person, NOT a firm name or organisation.
- Do NOT invent or fabricate email addresses or phone numbers — return null if unknown.
- Do NOT repeat the same lawyer.

Return ONLY a valid JSON array, no markdown, no explanation outside the JSON:
[
  {
    "name": "full name of the individual lawyer",
    "city": "${city}",
    "specialization": ["string"],
    "experience_years": 5,
    "email": null,
    "whatsapp_number": null,
    "bio": "1-2 sentence description of their practice",
    "source_url": "URL where this profile was found"
  }
]`;

  const parseResponse = (text: string): GroundedLawyer[] => {
    try {
      return JSON.parse(text) as GroundedLawyer[];
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]) as GroundedLawyer[];
      return [];
    }
  };

  const is429 = (err: any): boolean =>
    err?.status === 429 ||
    (typeof err?.message === 'string' &&
      (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')));

  // Attempt 1: Google Search Grounding (real-time web results)
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: sharedPrompt,
      config: { tools: [{ googleSearch: {} }] },
    });
    const results = parseResponse(response.text ?? '[]');
    if (results.length > 0) {
      console.log(`[gemini] Grounding returned ${results.length} lawyers.`);
      return results;
    }
  } catch (err: any) {
    if (is429(err)) {
      console.warn('[gemini] Grounding rate-limited (429), falling back to plain Gemini...');
    } else {
      console.error('[gemini] Grounding error:', err?.message ?? err);
    }
  }

  // Attempt 2: Plain Gemini (training knowledge — always available, no quota issues)
  try {
    console.warn('[gemini] Using plain Gemini knowledge (no live grounding).');
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: sharedPrompt,
    });
    return parseResponse(response.text ?? '[]');
  } catch (err: any) {
    console.error('[gemini] Plain Gemini fallback also failed:', err?.message ?? err);
    return [];
  }
}
