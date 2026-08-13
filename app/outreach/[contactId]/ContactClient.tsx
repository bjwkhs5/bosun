"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Contact, OutreachEmail } from "@/lib/supabase";

export default function ContactClient({
  contact,
  latestEmail,
}: {
  contact: Contact;
  latestEmail: OutreachEmail | null;
}) {
  const router = useRouter();

  const [email, setEmail] = useState(latestEmail);
  const [subject, setSubject] = useState(latestEmail?.subject ?? "");
  const [emailBody, setEmailBody] = useState(latestEmail?.body ?? "");
  const [busy, setBusy] = useState<"draft" | "save" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSent = email?.status === "sent";

  async function generateDraft() {
    setBusy("draft");
    setError(null);
    try {
      const res = await fetch("/api/outreach/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contact.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate draft");
      setEmail(data.email);
      setSubject(data.email.subject);
      setEmailBody(data.email.body);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function saveEdits() {
    if (!email) return;
    setBusy("save");
    setError(null);
    try {
      const res = await fetch(`/api/outreach/emails/${email.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body: emailBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setEmail(data.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function approveAndSend() {
    if (!email) return;
    setBusy("send");
    setError(null);
    try {
      const res = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: email.id, subject, body: emailBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setEmail(data.email);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">{contact.name || contact.organization}</h2>
        <p className="text-sm text-foreground/70">
          {contact.title ? `${contact.title}, ` : ""}
          {contact.organization} ·{" "}
          {contact.email ?? "no email on file"}
        </p>
        {contact.source_url && (
          <a
            href={contact.source_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-foreground/60 hover:underline"
          >
            source
          </a>
        )}
        {contact.notes && (
          <p className="mt-2 text-sm text-foreground/70">{contact.notes}</p>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm">
          {error}
        </p>
      )}

      {!email ? (
        <button
          onClick={generateDraft}
          disabled={busy !== null}
          className="self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {busy === "draft" ? "Drafting…" : "Generate draft"}
        </button>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Subject</span>
            <input
              value={subject}
              disabled={isSent}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-md border border-black/15 bg-transparent p-2.5 outline-none focus:border-foreground/50 disabled:opacity-60 dark:border-white/15"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Body</span>
            <textarea
              value={emailBody}
              disabled={isSent}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={12}
              className="rounded-md border border-black/15 bg-transparent p-2.5 font-mono text-sm outline-none focus:border-foreground/50 disabled:opacity-60 dark:border-white/15"
            />
          </label>

          {isSent ? (
            <p className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm">
              Sent {email.sent_at ? new Date(email.sent_at).toLocaleString() : ""}.
            </p>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={saveEdits}
                disabled={busy !== null}
                className="rounded-md border border-black/15 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5"
              >
                {busy === "save" ? "Saving…" : "Save edits"}
              </button>
              <button
                onClick={generateDraft}
                disabled={busy !== null}
                className="rounded-md border border-black/15 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5"
              >
                {busy === "draft" ? "Regenerating…" : "Regenerate"}
              </button>
              <button
                onClick={approveAndSend}
                disabled={busy !== null || !contact.email}
                title={
                  !contact.email
                    ? "No email address on file for this contact"
                    : undefined
                }
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {busy === "send" ? "Sending…" : "Approve & Send"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
