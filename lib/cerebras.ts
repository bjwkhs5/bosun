import Cerebras from "@cerebras/cerebras_cloud_sdk";

let client: Cerebras | null = null;

export function getCerebras() {
  if (!process.env.CEREBRAS_API_KEY) {
    throw new Error("Missing CEREBRAS_API_KEY in .env.local");
  }
  if (!client) {
    client = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY });
  }
  return client;
}

export const COMPLETION_MODEL = "gpt-oss-120b";

/** Runs a chat completion, e.g. for drafting or extracting structured data. */
export async function runCompletion(systemInstruction: string, userContent: string) {
  const cerebras = getCerebras();
  const response = await cerebras.chat.completions.create({
    model: COMPLETION_MODEL,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: userContent },
    ],
  });
  if ("error" in response) {
    throw new Error(response.error.message ?? "Cerebras returned an error");
  }
  if (response.object !== "chat.completion") {
    throw new Error("Cerebras returned an unexpected (non-completion) response");
  }
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
