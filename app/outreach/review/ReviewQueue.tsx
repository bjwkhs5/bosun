"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReviewItem } from "./page";

export default function ReviewQueue({ items }: { items: ReviewItem[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, { subject: string; body: string }>>(
    {}
  );
  const [busy, setBusy] = useState<Record<string, "send" | undefined>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  function toggleExpand(contactId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  }

  function getEdit(item: ReviewItem) {
    return edits[item.contact.id] ?? { subject: item.email.subject, body: item.email.body };
  }

  function updateEdit(contactId: string, field: "subject" | "body", value: string) {
    setEdits((prev) => ({
      ...prev,
      [contactId]: {
        subject: field === "subject" ? value : (prev[contactId]?.subject ?? ""),
        body: field === "body" ? value : (prev[contactId]?.body ?? ""),
      },
    }));
  }

  async function send(item: ReviewItem) {
    const edit = getEdit(item);
    setBusy((prev) => ({ ...prev, [item.contact.id]: "send" }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[item.contact.id];
      return next;
    });
    try {
      const res = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: item.email.id,
          subject: edit.subject,
          body: edit.body,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSentIds((prev) => new Set(prev).add(item.contact.id));
      router.refresh();
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [item.contact.id]: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      setBusy((prev) => ({ ...prev, [item.contact.id]: undefined }));
    }
  }

  const pending = items.filter((i) => !sentIds.has(i.contact.id));

  if (pending.length === 0) {
    return (
      <p className="text-sm text-foreground/70">
        No drafts waiting to be reviewed. Generate some from the{" "}
        <Link href="/outreach" className="underline">
          Dashboard
        </Link>{" "}
        or{" "}
        <Link href="/outreach/discover" className="underline">
          Discover
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
      {pending.map((item) => {
        const edit = getEdit(item);
        const isExpanded = expanded.has(item.contact.id);
        const itemBusy = busy[item.contact.id];
        const error = errors[item.contact.id];
        return (
          <div key={item.contact.id} className="flex flex-col gap-3 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Link
                  href={`/outreach/${item.contact.id}`}
                  className="font-medium hover:underline"
                >
                  {item.contact.name || item.contact.organization}
                </Link>
                <p className="truncate text-sm text-foreground/70">
                  {item.contact.organization} — {edit.subject}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => toggleExpand(item.contact.id)}
                  className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
                >
                  {isExpanded ? "Collapse" : "Inspect"}
                </button>
                <button
                  onClick={() => send(item)}
                  disabled={itemBusy !== undefined || !item.contact.email}
                  title={
                    !item.contact.email
                      ? "No email address on file for this contact"
                      : undefined
                  }
                  className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                >
                  {itemBusy === "send" ? "Sending…" : "Send"}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm">
                {error}
              </p>
            )}

            {isExpanded && (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">Subject</span>
                  <input
                    value={edit.subject}
                    onChange={(e) => updateEdit(item.contact.id, "subject", e.target.value)}
                    className="rounded-md border border-black/15 bg-transparent p-2.5 outline-none focus:border-foreground/50 dark:border-white/15"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">Body</span>
                  <textarea
                    value={edit.body}
                    onChange={(e) => updateEdit(item.contact.id, "body", e.target.value)}
                    rows={10}
                    className="rounded-md border border-black/15 bg-transparent p-2.5 font-mono text-sm outline-none focus:border-foreground/50 dark:border-white/15"
                  />
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
