import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, type ContactCategory } from "@/lib/supabase";
import { runWebSearch, extractJson } from "@/lib/openai";

interface Candidate {
  name: string;
  title: string;
  organization: string;
  email: string | null;
  source_url: string | null;
  notes: string;
}

const CATEGORY_GUIDANCE: Record<ContactCategory, string> = {
  brand_marketing:
    "Find real, publicly listed brand marketing/partnerships/press contacts " +
    "(named people if published, otherwise the brand's official " +
    "partnerships@/press@/marketing@ inbox) for the target described below. " +
    "Only use pages that are actually about this brand's partnerships, press, " +
    "or influencer/creator marketing.",
  literary_agent:
    "Find real literary agents who represent the genre/type of book described " +
    "below and are currently open to queries, using their agency's own " +
    "submission guidelines page for the query email and any stated preferences.",
};

export async function POST(req: NextRequest) {
  let body: { category?: string; query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const category = body.category as ContactCategory;
  const query = (body.query ?? "").trim();

  if (category !== "brand_marketing" && category !== "literary_agent") {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  let candidates: Candidate[];
  try {
    const response = await runWebSearch([
      {
        role: "system",
        content:
          CATEGORY_GUIDANCE[category] +
          " Respond with ONLY a JSON array (no prose, no markdown fences), " +
          "each item: {\"name\": string, \"title\": string, " +
          '"organization": string, "email": string|null, ' +
          '"source_url": string, "notes": string}. Use null for email if you ' +
          "could not find a specific one published anywhere — do not guess " +
          "or invent an email address. Return at most 8 items. Every item " +
          "must include the source_url you found it on.",
      },
      { role: "user", content: query },
    ]);

    candidates = extractJson<Candidate[]>(response.output_text);
    if (!Array.isArray(candidates)) throw new Error("Model did not return an array");
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Discovery failed: " +
          (err instanceof Error ? err.message : String(err)),
      },
      { status: 502 }
    );
  }

  // Drop anything with no real identifying info or an invented-looking email.
  candidates = candidates.filter((c) => c.organization && (c.name || c.email));

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
  const { data: existing, error: fetchError } = await supabase
    .from("contacts")
    .select("email, organization, name");

  if (fetchError) {
    return NextResponse.json(
      { error: `Failed to check existing contacts: ${fetchError.message}` },
      { status: 500 }
    );
  }

  const existingEmails = new Set(
    (existing ?? [])
      .map((c) => c.email?.toLowerCase())
      .filter((e): e is string => Boolean(e))
  );
  const existingOrgName = new Set(
    (existing ?? []).map(
      (c) => `${c.organization.toLowerCase()}::${c.name.toLowerCase()}`
    )
  );

  const toInsert = candidates.filter((c) => {
    if (c.email && existingEmails.has(c.email.toLowerCase())) return false;
    const key = `${c.organization.toLowerCase()}::${c.name.toLowerCase()}`;
    if (existingOrgName.has(key)) return false;
    return true;
  });

  const skipped = candidates.length - toInsert.length;

  if (toInsert.length === 0) {
    return NextResponse.json({ inserted: [], skipped, candidatesFound: candidates.length });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("contacts")
    .insert(
      toInsert.map((c) => ({
        name: c.name || "",
        title: c.title || "",
        organization: c.organization,
        category,
        email: c.email,
        source_url: c.source_url,
        notes: c.notes || "",
        status: "new" as const,
      }))
    )
    .select();

  if (insertError) {
    return NextResponse.json(
      { error: `Failed to save contacts: ${insertError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    inserted,
    skipped,
    candidatesFound: candidates.length,
  });
}
