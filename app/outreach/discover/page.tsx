"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SavedSearch } from "@/lib/supabase";

interface FoundContact {
  id: string;
  name: string;
  title: string;
  organization: string;
  email: string | null;
  source_url: string | null;
}

const CATEGORY_LABELS: Record<SavedSearch["category"], string> = {
  brand_marketing: "Brand marketing / partnerships",
  literary_agent: "Literary agents",
  grants_partnerships: "Grants & partnerships",
};

export default function DiscoverPage() {
  const router = useRouter();
  const [category, setCategory] = useState<
    "brand_marketing" | "literary_agent" | "grants_partnerships"
  >("brand_marketing");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    inserted: FoundContact[];
    skipped: number;
    candidatesFound: number;
    error?: string;
  } | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(
    null
  );
  const [draftStatus, setDraftStatus] = useState<Record<string, "ok" | "error">>({});

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [savingSearch, setSavingSearch] = useState(false);
  const [savedSearchError, setSavedSearchError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/outreach/saved-searches")
      .then((res) => res.json())
      .then((data) => setSavedSearches(data.savedSearches ?? []))
      .catch(() => {});
  }, []);

  async function saveStandingSearch() {
    if (!query.trim()) return;
    setSavingSearch(true);
    setSavedSearchError(null);
    try {
      const res = await fetch("/api/outreach/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save search");
      setSavedSearches((prev) => [data.savedSearch, ...prev]);
    } catch (err) {
      setSavedSearchError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingSearch(false);
    }
  }

  async function deleteSavedSearch(id: string) {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    try {
      await fetch(`/api/outreach/saved-searches/${id}`, { method: "DELETE" });
    } catch {
      // Not critical enough to roll back the optimistic removal for.
    }
  }

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
      setSelected(new Set(data.inserted.map((c: FoundContact) => c.id)));
      setDraftStatus({});
      setBulkProgress(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generateSelectedDrafts() {
    if (!result || selected.size === 0) return;
    setBulkBusy(true);
    setBulkProgress({ done: 0, total: selected.size });
    const ids = result.inserted.map((c) => c.id).filter((id) => selected.has(id));
    for (let i = 0; i < ids.length; i++) {
      try {
        const res = await fetch("/api/outreach/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId: ids[i] }),
        });
        setDraftStatus((prev) => ({ ...prev, [ids[i]]: res.ok ? "ok" : "error" }));
      } catch {
        setDraftStatus((prev) => ({ ...prev, [ids[i]]: "error" }));
      }
      setBulkProgress({ done: i + 1, total: ids.length });
    }
    setBulkBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">
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
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={category === "grants_partnerships"}
              onChange={() => setCategory("grants_partnerships")}
            />
            Grants &amp; partnerships
          </label>
        </div>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={4}
          placeholder={
            (category === "brand_marketing"
              ? "e.g. golf apparel brands that run creator/ambassador partnerships with new golfers"
              : category === "literary_agent"
              ? "e.g. agents who represent memoirs about race, career, and identity"
              : "e.g. arts council grants for debut authors, or companies that sponsor golf memoirs") +
            "\n\nOne search per line to run several at once."
          }
          className="rounded-md border border-card-border bg-transparent p-2.5 text-sm outline-none focus:border-accent"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Searching…" : "Search"}
          </button>
          <button
            type="button"
            onClick={saveStandingSearch}
            disabled={savingSearch || !query.trim()}
            className="self-start rounded-md border border-card-border px-4 py-2 text-sm hover:bg-accent-soft disabled:opacity-50"
          >
            {savingSearch ? "Saving…" : "Save as standing search"}
          </button>
        </div>
        {savedSearchError && (
          <p className="text-sm text-red-600 dark:text-red-400">{savedSearchError}</p>
        )}
      </form>

      {savedSearches.length > 0 && (
        <div className="rounded-lg border border-card-border bg-card p-4 text-sm shadow-sm">
          <p className="mb-3 text-muted">
            Standing searches — these run automatically once a day and add
            whatever they find straight to your Dashboard.
          </p>
          <ul className="flex flex-col divide-y divide-card-border">
            {savedSearches.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-2">
                <div>
                  <p className="font-medium">{s.query}</p>
                  <p className="text-muted">
                    {CATEGORY_LABELS[s.category]}
                    {s.last_run_at
                      ? ` · last ran ${new Date(s.last_run_at).toLocaleDateString()}`
                      : " · not run yet"}
                  </p>
                </div>
                <button
                  onClick={() => deleteSavedSearch(s.id)}
                  className="shrink-0 rounded-md border border-red-500/30 px-2.5 py-1 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-400"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm">
          {error}
        </p>
      )}

      {result && (
        <div className="rounded-lg border border-card-border bg-card p-4 text-sm shadow-sm">
          <p className="mb-3 text-muted">
            Found {result.candidatesFound}, added {result.inserted.length} new,
            skipped {result.skipped} already-known.
          </p>
          {result.error && (
            <p className="mb-3 rounded-md border border-orange-500/30 bg-orange-500/10 p-2 text-orange-700 dark:text-orange-300">
              Some searches in this batch failed: {result.error}
            </p>
          )}
          {result.inserted.length > 0 && (
            <>
              <ul className="flex flex-col gap-2">
                {result.inserted.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleSelected(c.id)}
                      disabled={bulkBusy}
                    />
                    <Link
                      href={`/outreach/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.name || c.organization}
                    </Link>
                    <span className="text-muted">
                      — {c.title ? `${c.title}, ` : ""}
                      {c.organization}
                      {c.email ? ` · ${c.email}` : " · no email found"}
                    </span>
                    {draftStatus[c.id] === "ok" && (
                      <span className="text-green-600 dark:text-green-400">✓ drafted</span>
                    )}
                    {draftStatus[c.id] === "error" && (
                      <span className="text-red-600 dark:text-red-400">✗ failed</span>
                    )}
                  </li>
                ))}
              </ul>
              <button
                onClick={generateSelectedDrafts}
                disabled={bulkBusy || selected.size === 0}
                className="mt-4 self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
              >
                {bulkBusy
                  ? `Drafting ${bulkProgress?.done ?? 0}/${bulkProgress?.total ?? 0}…`
                  : `Generate drafts for ${selected.size} selected`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
