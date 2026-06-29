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
 * Generate 768-dimension text embedding using text-embedding-004 model.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: text,
    });

    const values = response?.embeddings?.[0]?.values;
    if (!values) {
      throw new Error('No embedding values returned in response');
    }
    return values;
  } catch (error) {
    console.error('Error generating embedding with text-embedding-004:', error);
    throw error;
  }
}
