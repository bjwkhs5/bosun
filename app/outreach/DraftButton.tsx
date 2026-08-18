"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DraftButton({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/outreach/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate draft");
      router.push(`/outreach/${contactId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        onClick={handleClick}
        disabled={busy}
        className="rounded-md border border-black/15 px-2 py-0.5 text-xs hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5"
      >
        {busy ? "Drafting…" : "Draft"}
      </button>
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </span>
  );
}
