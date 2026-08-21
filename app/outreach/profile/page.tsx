import { getSupabaseAdmin, type Profile } from "@/lib/supabase";
import { saveProfile } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  let profile: Profile | null = null;
  let loadError: string | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("profile")
      .select("*")
      .eq("id", 1)
      .single();
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
        This is what every drafted email is built from — your bio, book, and
        what you&apos;re asking for. Keep it current.
      </p>
      <form action={saveProfile} className="flex flex-col gap-5">
        <Field
          label="Bio"
          name="bio"
          defaultValue={profile?.bio}
          placeholder="Software engineer, published author, and new golfer sharing the journey of..."
          rows={4}
        />
        <Field
          label="Book title"
          name="book_title"
          defaultValue={profile?.book_title}
          placeholder="Your book's title"
        />
        <Field
          label="Book details"
          name="book_details"
          defaultValue={profile?.book_details}
          placeholder="Genre, logline, publication status/date, comp titles..."
          rows={4}
        />
        <Field
          label="Links"
          name="links"
          defaultValue={profile?.links}
          placeholder="Website, book page, socials, press mentions — one per line"
          rows={3}
        />
        <Field
          label="What you're asking for"
          name="ask"
          defaultValue={profile?.ask}
          placeholder="e.g. paid content partnership, gear sponsorship, agent representation for the book..."
          rows={3}
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
