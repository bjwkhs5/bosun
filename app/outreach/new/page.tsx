"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddContactPage() {
  const router = useRouter();
  const [category, setCategory] = useState<
    "brand_marketing" | "literary_agent" | "grants_partnerships"
  >("brand_marketing");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/outreach/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          title,
          organization,
          category,
          email,
          source_url: sourceUrl,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add contact");
      router.push(`/outreach/${data.contact.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-foreground/70">
        Already know who you want to reach? Add them directly instead of
        waiting on Discover.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Organization *</span>
          <input
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            required
            className="rounded-md border border-black/15 bg-transparent p-2.5 outline-none focus:border-foreground/50 dark:border-white/15"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Leave blank if unknown"
            className="rounded-md border border-black/15 bg-transparent p-2.5 outline-none focus:border-foreground/50 dark:border-white/15"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-black/15 bg-transparent p-2.5 outline-none focus:border-foreground/50 dark:border-white/15"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Leave blank if you don't have one yet"
            className="rounded-md border border-black/15 bg-transparent p-2.5 outline-none focus:border-foreground/50 dark:border-white/15"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Source URL</span>
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="Where you found them (optional)"
            className="rounded-md border border-black/15 bg-transparent p-2.5 outline-none focus:border-foreground/50 dark:border-white/15"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything the draft should know about them"
            className="rounded-md border border-black/15 bg-transparent p-2.5 outline-none focus:border-foreground/50 dark:border-white/15"
          />
        </label>

        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !organization.trim()}
          className="self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add contact"}
        </button>
      </form>
    </div>
  );
}
