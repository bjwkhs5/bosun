import { NextRequest, NextResponse } from "next/server";
import { type ContactCategory } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { runDiscoveryBatch, CATEGORY_GUIDANCE } from "@/lib/discovery";

// Each query line in a mass search runs sequentially (~5-10s each); this
// gives headroom for several before hitting the platform's function timeout.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { category?: string; query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const category = body.category as ContactCategory;
  const queries = (body.query ?? "")
    .split("\n")
    .map((q) => q.trim())
    .filter(Boolean);

  if (!(category in CATEGORY_GUIDANCE)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (queries.length === 0) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const result = await runDiscoveryBatch(supabase, category, queries, user.id);
    return NextResponse.json({
      inserted: result.inserted,
      skipped: result.skipped,
      candidatesFound: result.candidatesFound,
      error: result.errors.length > 0 ? result.errors.join("; ") : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
