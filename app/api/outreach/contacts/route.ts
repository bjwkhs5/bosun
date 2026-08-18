import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, type ContactCategory } from "@/lib/supabase";

const VALID_CATEGORIES: ContactCategory[] = [
  "brand_marketing",
  "literary_agent",
  "grants_partnerships",
];

export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    title?: string;
    organization?: string;
    category?: string;
    email?: string;
    source_url?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const organization = (body.organization ?? "").trim();
  const category = body.category as ContactCategory;

  if (!organization) {
    return NextResponse.json({ error: "Organization is required" }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
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
    .from("contacts")
    .insert({
      name: (body.name ?? "").trim(),
      title: (body.title ?? "").trim(),
      organization,
      category,
      email: body.email?.trim() || null,
      source_url: body.source_url?.trim() || null,
      notes: (body.notes ?? "").trim(),
      status: "new" as const,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Failed to save contact: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ contact: data });
}
