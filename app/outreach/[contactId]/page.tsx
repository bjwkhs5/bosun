import { createServerSupabaseClient } from "@/lib/supabase/server";
import ContactClient from "./ContactClient";

export const dynamic = "force-dynamic";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;

  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch (err) {
    return (
      <p className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm">
        {err instanceof Error ? err.message : String(err)}. See{" "}
        <code>SETUP.md</code> in the repo.
      </p>
    );
  }

  const { data: contact, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  if (error || !contact) {
    return (
      <p className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm">
        Contact not found.
      </p>
    );
  }

  const { data: emails } = await supabase
    .from("outreach_emails")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: mediaAssets } = await supabase
    .from("media_assets")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <ContactClient
      contact={contact}
      latestEmail={emails?.[0] ?? null}
      mediaAssets={mediaAssets ?? []}
    />
  );
}
