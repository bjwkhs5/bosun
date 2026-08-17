import Link from "next/link";
import { getSupabaseAdmin, type Contact } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<Contact["status"], string> = {
  new: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  drafted: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
  approved: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
  sent: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30",
  rejected: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
};

const CATEGORY_LABELS: Record<Contact["category"], string> = {
  brand_marketing: "Brand marketing / partnerships",
  literary_agent: "Literary agents",
};

export default async function OutreachDashboard() {
  let contacts: Contact[] = [];
  let loadError: string | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
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
      <div className="flex flex-col gap-3">
        <p className="text-sm text-foreground/70">
          No contacts yet. Start by filling in your{" "}
          <Link href="/outreach/profile" className="underline">
            profile
          </Link>
          , then{" "}
          <Link href="/outreach/discover" className="underline">
            discover
          </Link>{" "}
          some contacts.
        </p>
      </div>
    );
  }

  const grouped = contacts.reduce<Record<string, Contact[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-8">
      {Object.entries(grouped).map(([category, items]) => (
        <section key={category}>
          <h2 className="mb-3 text-sm font-semibold text-foreground/70">
            {CATEGORY_LABELS[category as Contact["category"]]} ({items.length})
          </h2>
          <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {items.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3">
                <Link href={`/outreach/${c.id}`} className="hover:underline">
                  <span className="font-medium">{c.name || c.organization}</span>
                  <span className="text-sm text-foreground/70">
                    {" "}
                    — {c.title ? `${c.title}, ` : ""}
                    {c.organization}
                  </span>
                </Link>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs ${STATUS_STYLES[c.status]}`}
                >
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
