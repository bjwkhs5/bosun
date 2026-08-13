"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FoundContact {
  id: string;
  name: string;
  title: string;
  organization: string;
  email: string | null;
  source_url: string | null;
}

export default function DiscoverPage() {
  const router = useRouter();
  const [category, setCategory] = useState<"brand_marketing" | "literary_agent">(
    "brand_marketing"
  );
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    inserted: FoundContact[];
    skipped: number;
    candidatesFound: number;
  } | null>(null);

  async function runDiscovery(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/outreach/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Discovery failed");
      setResult(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-foreground/70">
        Describe who you&apos;re looking for. This searches the public web —
        it finds published contacts (agency submission pages, brand
        partnerships/press inboxes), not private inboxes. Review everything
        it finds before drafting or sending.
      </p>

      <form onSubmit={runDiscovery} className="flex flex-col gap-4">
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={category === "brand_marketing"}
              onChange={() => setCategory("brand_marketing")}
            />
            Brand marketing / partnerships
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={category === "literary_agent"}
              onChange={() => setCategory("literary_agent")}
            />
            Literary agent
          </label>
        </div>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          placeholder={
            category === "brand_marketing"
              ? "e.g. golf apparel brands that run creator/ambassador partnerships with new golfers"
              : "e.g. agents who represent memoirs about race, career, and identity"
          }
          className="rounded-md border border-black/15 bg-transparent p-2.5 text-sm outline-none focus:border-foreground/50 dark:border-white/15"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm">
          {error}
        </p>
      )}

      {result && (
        <div className="rounded-md border border-black/10 p-4 text-sm dark:border-white/10">
          <p className="mb-3 text-foreground/70">
            Found {result.candidatesFound}, added {result.inserted.length} new,
            skipped {result.skipped} already-known.
          </p>
          {result.inserted.length > 0 && (
            <ul className="flex flex-col gap-2">
              {result.inserted.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/outreach/${c.id}`}
                    className="font-medium hover:underline"
                  >
                    {c.name || c.organization}
                  </Link>
                  <span className="text-foreground/70">
                    {" "}
                    — {c.title ? `${c.title}, ` : ""}
                    {c.organization}
                    {c.email ? ` · ${c.email}` : " · no email found"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
