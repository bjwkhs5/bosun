import { createServerSupabaseClient } from "@/lib/supabase/server";
import MediaLibraryClient from "./MediaLibraryClient";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  let assets: Awaited<ReturnType<typeof loadAssets>> = [];
  let loadError: string | null = null;

  try {
    assets = await loadAssets();
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  if (loadError) {
    return (
      <p className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm">
        Couldn&apos;t load your media library: {loadError}. See{" "}
        <code>SETUP.md</code> in the repo.
      </p>
    );
  }

  return <MediaLibraryClient initial={assets} />;
}

async function loadAssets() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
