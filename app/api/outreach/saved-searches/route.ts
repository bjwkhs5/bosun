import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, type ContactCategory } from "@/lib/supabase";

const VALID_CATEGORIES: ContactCategory[] = [
  "brand_marketing",
  "literary_agent",
  "grants_partnerships",
];

export async function GET() {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("saved_searches")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: `Failed to load saved searches: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ savedSearches: data ?? [] });
}

export async function POST(req: NextRequest) {
  let body: { category?: string; query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const category = body.category as ContactCategory;
  const query = (body.query ?? "").trim();

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
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

  const { data, error } = await supabase
    .from("saved_searches")
    .insert({ category, query })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Failed to save search: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ savedSearch: data });
}
