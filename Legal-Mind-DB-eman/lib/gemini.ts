import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

// If running in Node.js (scripts), load env variables
if (typeof window === 'undefined') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

const geminiApiKey = process.env.GEMINI_API_KEY || '';

if (!geminiApiKey) {
  console.warn('GEMINI_API_KEY is missing. Verify your environment configuration.');
}

// Initialize Gemini client
export const ai = new GoogleGenAI({ apiKey: geminiApiKey });

/**
 * Wait for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract the retry delay (in ms) from a Gemini 429 ApiError.
 * Falls back to 65 seconds if the header isn't present.
 */
function parseRetryDelayMs(error: any): number {
  try {
    const details: any[] = error?.errorDetails ?? [];
    const retryInfo = details.find((d: any) =>
      typeof d?.['@type'] === 'string' && d['@type'].includes('RetryInfo')
    );
    if (retryInfo?.retryDelay) {
      const seconds = parseInt(String(retryInfo.retryDelay).replace('s', ''), 10);
      if (!isNaN(seconds) && seconds > 0) {
        return (seconds + 5) * 1000; // +5 s buffer
      }
    }
  } catch {
    // ignore parse errors
  }
  return 65_000; // safe fallback
}

/**
 * Generate 768-dimension text embedding using gemini-embedding-001 model.
 * Automatically retries on 429 rate-limit errors using the server-supplied delay.
 */
export async function getEmbedding(text: string, maxRetries = 5): Promise<number[]> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
        config: {
          outputDimensionality: 768,
        },
      });

      const values = response?.embeddings?.[0]?.values;
      if (!values) {
        throw new Error('No embedding values returned in response');
      }
      return values;
    } catch (error: any) {
      const is429 = error?.status === 429 || error?.message?.includes('"code":429');
      if (is429 && attempt < maxRetries) {
        const waitMs = parseRetryDelayMs(error);
        console.warn(
          `[Rate Limit] 429 received. Waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 1}/${maxRetries}...`
        );
        await sleep(waitMs);
        continue;
      }
      console.error('Error generating embedding with gemini-embedding-001:', error);
      throw error;
    }
  }
  throw new Error('Max retries exceeded for embedding generation');
}
