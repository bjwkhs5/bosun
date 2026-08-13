import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY in .env.local");
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export const DISCOVERY_MODEL = "gpt-4.1";
export const DRAFT_MODEL = "gpt-4.1";

type EasyInputMessage = { role: "system" | "user"; content: string };

/**
 * Runs a Responses API call with the hosted web-search tool. OpenAI has
 * renamed this tool type before (web_search_preview -> web_search); if the
 * primary name is rejected as an unknown tool type, retry once with the
 * older name so discovery doesn't silently break on an API-side rename.
 */
export async function runWebSearch(input: EasyInputMessage[]) {
  const openai = getOpenAI();
  try {
    return await openai.responses.create({
      model: DISCOVERY_MODEL,
      tools: [{ type: "web_search" }],
      input,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/web_search/i.test(message)) throw err;
    return await openai.responses.create({
      model: DISCOVERY_MODEL,
      tools: [{ type: "web_search_preview" }],
      input,
    });
  }
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
