import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

console.log(process.env.GEMINI_API_KEY ? "API key loaded" : "API key missing");
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

import { getEmbedding } from "./gemini";

async function main() {
    // Test text generation
    try {
        console.log("Testing Gemini 2.5 Flash text generation...");
        const res = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Say hello",
        });
        console.log("Response:", res.text?.trim());
    } catch (e: any) {
        console.error("Text generation failed:", e.message || e);
    }

    // Test embedding generation
    try {
        console.log("Testing getEmbedding from lib/gemini.ts...");
        const embedding = await getEmbedding("Test embedding generation");
        console.log("Success! Embedding length:", embedding.length);
        console.log("First 5 values:", embedding.slice(0, 5));
    } catch (e: any) {
        console.error("getEmbedding failed:", e.message || e);
    }
}

main();