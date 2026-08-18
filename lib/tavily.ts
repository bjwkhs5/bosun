export interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

/** Runs a web search via Tavily (free tier, no billing required). */
export async function tavilySearch(query: string): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("Missing TAVILY_API_KEY in .env.local");
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      max_results: 10,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily search failed: ${res.status} ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const results = Array.isArray(data.results) ? data.results : [];
  return results.map((r: { title?: string; url?: string; content?: string }) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    content: r.content ?? "",
  }));
}
