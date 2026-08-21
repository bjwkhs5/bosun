import Link from "next/link";
import { getSupabaseAdmin, type Contact } from "@/lib/supabase";
import DraftButton from "./DraftButton";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<Contact["status"], string> = {
  new: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  drafted: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
  approved: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
  sent: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30",
  replied: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  rejected: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
};

const CATEGORY_LABELS: Record<Contact["category"], string> = {
  brand_marketing: "Brand marketing / partnerships",
  literary_agent: "Literary agents",
  grants_partnerships: "Grants & partnerships",
};

const FOLLOW_UP_DAYS = 7;

type ContactWithEmails = Contact & {
  outreach_emails: { sent_at: string | null; status: string }[];
};

function daysSinceSent(contact: ContactWithEmails): number | null {
  if (contact.status !== "sent") return null;
  const sentDates = contact.outreach_emails
    .filter((e) => e.status === "sent" && e.sent_at)
    .map((e) => new Date(e.sent_at as string).getTime());
  if (sentDates.length === 0) return null;
  const mostRecent = Math.max(...sentDates);
  return Math.floor((Date.now() - mostRecent) / 86_400_000);
}

export default async function OutreachDashboard() {
  let contacts: ContactWithEmails[] = [];
  let loadError: string | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("contacts")
      .select("*, outreach_emails(sent_at, status)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    contacts = data ?? [];
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  if (loadError) {
    return (
      <p className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm">
        Couldn&apos;t load contacts: {loadError}. See{" "}
        <code>SETUP.md</code> in the repo for what still needs configuring.
      </p>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-card-border p-8 text-center">
        <p className="text-sm text-muted">
          No contacts yet. Start by filling in your{" "}
          <Link href="/outreach/profile" className="text-accent underline underline-offset-2">
            profile
          </Link>
          , then{" "}
          <Link href="/outreach/discover" className="text-accent underline underline-offset-2">
            discover
          </Link>{" "}
          some contacts.
        </p>
      </div>
    );
  }

  const grouped = contacts.reduce<Record<string, ContactWithEmails[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-8">
      {Object.entries(grouped).map(([category, items]) => (
        <section key={category}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
            {CATEGORY_LABELS[category as Contact["category"]]}
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
              {items.length}
            </span>
          </h2>
          <ul className="flex flex-col gap-2.5">
            {items.map((c) => {
              const days = daysSinceSent(c);
              const needsFollowUp = days !== null && days >= FOLLOW_UP_DAYS;
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-card-border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="flex flex-wrap items-center gap-2.5">
                    <Link href={`/outreach/${c.id}`} className="hover:text-accent">
                      <span className="font-medium">{c.name || c.organization}</span>
                      <span className="text-sm text-muted">
                        {" "}
                        — {c.title ? `${c.title}, ` : ""}
                        {c.organization}
                      </span>
                    </Link>
                    <DraftButton contactId={c.id} />
                  </span>
                  <span className="flex items-center gap-2">
                    {needsFollowUp && (
                      <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-xs text-orange-700 dark:text-orange-300">
                        Follow up · {days}d, no reply
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs ${STATUS_STYLES[c.status]}`}
                    >
                      {c.status}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
