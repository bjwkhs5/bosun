import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function getGemini() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in .env.local");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

export const DRAFT_MODEL = "gemini-3.6-flash";

/** Runs a plain (non-search) prompt, e.g. for drafting or extraction. */
export async function runCompletion(systemInstruction: string, userContent: string) {
  const ai = getGemini();
  const response = await ai.models.generateContent({
    model: DRAFT_MODEL,
    contents: userContent,
    config: { systemInstruction },
  });
  return response.text ?? "";
}

/**
 * Pulls the first top-level JSON object/array out of a model response,
 * tolerating ```json fences the model sometimes adds despite instructions.
 */
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  return JSON.parse(candidate.trim()) as T;
}
