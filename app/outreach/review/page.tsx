import { getSupabaseAdmin, type Contact, type OutreachEmail } from "@/lib/supabase";
import ReviewQueue from "./ReviewQueue";

export const dynamic = "force-dynamic";

export interface ReviewItem {
  contact: Contact;
  email: OutreachEmail;
}

export default async function ReviewPage() {
  let items: ReviewItem[] = [];
  let loadError: string | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("contacts")
      .select("*, outreach_emails(*)")
      .eq("status", "drafted")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    items = ((data ?? []) as (Contact & { outreach_emails: OutreachEmail[] })[])
      .map((c) => {
        const drafts = c.outreach_emails
          .filter((e) => e.status === "draft")
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        const { outreach_emails, ...contact } = c;
        return drafts[0] ? { contact, email: drafts[0] } : null;
      })
      .filter((i): i is ReviewItem => i !== null);
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  if (loadError) {
    return (
      <p className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm">
        Couldn&apos;t load drafts: {loadError}. See <code>SETUP.md</code> in the
        repo for what still needs configuring.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Every drafted email waiting to be sent. Send as-is, or Inspect to edit
        first.
      </p>
      <ReviewQueue items={items} />
    </div>
  );
}
