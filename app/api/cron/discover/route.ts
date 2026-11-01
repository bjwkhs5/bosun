import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, type SavedSearch } from "@/lib/supabase";
import { runDiscoveryBatch } from "@/lib/discovery";

// Standing searches run one after another; give this the platform max so a
// handful of saved searches don't get cut off mid-run.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  const { data: savedSearches, error: fetchError } = await supabase
    .from("saved_searches")
    .select("*");

  if (fetchError) {
    return NextResponse.json(
      { error: `Failed to load saved searches: ${fetchError.message}` },
      { status: 500 }
    );
  }

  // Group by user_id and run each user's searches as their own batch — this
  // admin-client path bypasses RLS entirely, so pooling searches from
  // different tenants into one runDiscoveryBatch call would let one
  // tenant's discovery dedupe against (and thus silently skip) another
  // tenant's contacts.
  const searchesByUser = new Map<string, SavedSearch[]>();
  for (const search of (savedSearches ?? []) as SavedSearch[]) {
    const list = searchesByUser.get(search.user_id) ?? [];
    list.push(search);
    searchesByUser.set(search.user_id, list);
  }

  const results = [];
  for (const [userId, searches] of searchesByUser) {
    for (const search of searches) {
      try {
        const result = await runDiscoveryBatch(
          supabase,
          search.category,
          [search.query],
          userId
        );
        await supabase
          .from("saved_searches")
          .update({ last_run_at: new Date().toISOString() })
          .eq("id", search.id);
        results.push({
          query: search.query,
          inserted: result.inserted.length,
          skipped: result.skipped,
          candidatesFound: result.candidatesFound,
          errors: result.errors,
        });
      } catch (err) {
        results.push({
          query: search.query,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return NextResponse.json({ ran: results.length, results });
}
