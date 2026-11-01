import { type Profile } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { saveProfile } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  let profile: Profile | null = null;
  let loadError: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    // No .eq needed — RLS scopes this to exactly the caller's own row.
    const { data, error } = await supabase.from("profile").select("*").single();
    if (error) throw new Error(error.message);
    profile = data;
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  if (loadError) {
    return (
      <p className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm">
        Couldn&apos;t load your profile: {loadError}. Check{" "}
        <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>.env.local</code> and
        that you ran <code>supabase/schema.sql</code> — see SETUP.md.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-6 text-sm text-muted">
        Every pitch Bosun drafts is built from this page: who you are, what
        you make, who it reaches, and what kind of partnership you want. The
        more specific you are, especially about audience numbers and past
        brand work, the better your pitches will be.
      </p>
      <form action={saveProfile} className="flex flex-col gap-5">
        <Field
          label="Bio"
          name="bio"
          defaultValue={profile?.bio}
          placeholder="Who you are and what you're known for, e.g. a weekend golfer documenting the journey from 110 to breaking 90"
          rows={4}
        />
        <Field
          label="What you create"
          name="book_title"
          defaultValue={profile?.book_title}
          placeholder="Your channel, podcast, newsletter, or book, e.g. Fairway Rookie on YouTube and Instagram"
        />
        <Field
          label="Audience & reach"
          name="book_details"
          defaultValue={profile?.book_details}
          placeholder="Followers/subscribers per platform, average views or downloads, audience demographics, past brand partnerships..."
          rows={4}
        />
        <Field
          label="Links"
          name="links"
          defaultValue={profile?.links}
          placeholder="Media kit, channel, socials, website, press mentions, one per line"
          rows={3}
        />
        <Field
          label="What you're asking for"
          name="ask"
          defaultValue={profile?.ask}
          placeholder="e.g. paid sponsored video, gear sponsorship, affiliate deal, long-term ambassador role..."
          rows={3}
        />
        <Field
          label="Reply-to email (optional)"
          name="reply_to_email"
          defaultValue={profile?.reply_to_email ?? undefined}
          placeholder="Replies to your outreach go here instead of the sending address"
          rows={1}
        />
        <button
          type="submit"
          className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          Save profile
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  rows,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={rows ?? 2}
        className="rounded-md border border-card-border bg-transparent p-2.5 outline-none focus:border-accent"
      />
    </label>
  );
}
