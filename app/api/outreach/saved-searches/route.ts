import { NextRequest, NextResponse } from "next/server";
import { type ContactCategory } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const VALID_CATEGORIES: ContactCategory[] = [
  "brand_marketing",
  "literary_agent",
  "grants_partnerships",
];

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
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

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("saved_searches")
    .insert({ user_id: user.id, category, query })
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
