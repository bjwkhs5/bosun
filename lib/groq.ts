import Groq from "groq-sdk";

let client: Groq | null = null;

export function getGroq() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY in .env.local");
  }
  if (!client) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

export const COMPLETION_MODEL = "llama-3.3-70b-versatile";

/** Runs a chat completion, e.g. for drafting or extracting structured data. */
export async function runCompletion(systemInstruction: string, userContent: string) {
  const groq = getGroq();
  const response = await groq.chat.completions.create({
    model: COMPLETION_MODEL,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: userContent },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
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
