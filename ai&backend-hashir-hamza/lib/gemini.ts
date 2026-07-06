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
    model: 'gemini-2.5-flash',
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
    model: 'gemini-2.5-flash',
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
): Promise<string> {
  const details = Object.entries(safeToShare)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const prompt = `You are drafting a professional, polite, and completely English message from a Pakistani citizen to a lawyer asking for legal assistance.
Do not include any Urdu words or translations; the message must be written entirely in English.

Case Title: ${caseTitle}
Case Type: ${caseType}
Shareable Details:
${details}

Write a polite, professional message (150–250 words). Introduce the client, briefly describe the issue using only the details above, ask if the lawyer is available to take the case, and request a consultation. Do NOT include any personal identifiers (CNIC, home address). Sign off as "The Client".`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
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
    model: 'gemini-2.5-flash',
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
    model: 'gemini-2.5-flash',
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
  const prompt = `Find 5 to 8 real, active, practicing lawyers or law firms in ${city}, Pakistan who handle ${caseType} cases.
Search the web to retrieve their actual information:
- Name
- City (must be ${city})
- Specialization (array of strings, e.g. ["Family Law", "Divorce Law"])
- Experience years (estimate based on their bar enrollment or biography, default to 5 if unknown)
- Email address (Only return real, actual email addresses discovered on the web. Do not synthesize or invent mock email addresses. If the actual email is not found, return null.)
- Phone or WhatsApp number (Only return real numbers. If not found, return null.)
- A brief bio or description of their practice
- Source URL (the webpage or directory where you found their profile)

Respond with ONLY a valid JSON array of objects, no markdown:
[
  {
    "name": "string",
    "city": "string",
    "specialization": ["string"],
    "experience_years": number,
    "email": "string | null",
    "whatsapp_number": "string | null",
    "bio": "string",
    "source_url": "string"
  }
]`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text ?? '[]';
    try {
      return JSON.parse(text) as GroundedLawyer[];
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]) as GroundedLawyer[];
      return [];
    }
  } catch (err) {
    console.error('[gemini] Web search grounding failed:', err);
    return [];
  }
}
