import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, type ContactCategory } from "@/lib/supabase";
import { runCompletion, extractJson } from "@/lib/cerebras";
import { tavilySearch } from "@/lib/tavily";

interface RawCandidate {
  name: string;
  title: string;
  organization: string;
  email: string | null;
  source_url: string | null;
  notes: string;
}

interface Candidate extends RawCandidate {
  email: string;
}

const CATEGORY_SEARCH_HINTS: Record<ContactCategory, string> = {
  brand_marketing: "brand partnerships press marketing contact email",
  literary_agent: "literary agent submission guidelines query manuscript",
  grants_partnerships: "grant program application guidelines partnerships contact",
};

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
  grants_partnerships:
    "Find real grant programs, government agencies/arts councils, foundations, " +
    "or companies with a corporate partnerships/sponsorship program relevant " +
    "to the target described below. For each, use the organization's own " +
    "published page (grant guidelines, partnerships page, or contact page) " +
    "for the contact email/inbox and note any application deadline, eligibility " +
    "requirements, or submission process mentioned there.",
};

async function findCandidates(
  query: string,
  category: ContactCategory
): Promise<Candidate[]> {
  const searchResults = await tavilySearch(`${query} ${CATEGORY_SEARCH_HINTS[category]}`);
  if (searchResults.length === 0) {
    return [];
  }

  const searchContext = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content.slice(0, 1500)}`)
    .join("\n\n");

  const systemInstruction =
    CATEGORY_GUIDANCE[category] +
    " You are extracting from the web search results provided below — " +
    "only use information actually present in them, do not use outside " +
    "knowledge or invent anything not stated in the results. Only include " +
    "an item if the results show a real, specific email address for it — " +
    "skip anything without one, do not guess or invent an email address. " +
    'Respond with ONLY a JSON array (no prose, no markdown fences), each ' +
    'item: {"name": string, "title": string, "organization": string, ' +
    '"email": string, "source_url": string, "notes": string}. Return at ' +
    "most 8 items. Every item's source_url must be a URL that actually " +
    "appears in the results below.";

  const userContent = `Target: ${query}\n\nSearch results:\n\n${searchContext}`;

  const text = await runCompletion(systemInstruction, userContent);
  const candidates = extractJson<RawCandidate[]>(text);
  if (!Array.isArray(candidates)) throw new Error("Model did not return an array");

  // Drop anything with no real identifying info or missing email — this app
  // can only ever send to a contact that has one.
  return candidates.filter(
    (c): c is Candidate => Boolean(c.organization) && Boolean(c.email)
  );
}

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

  let candidatesFound = 0;
  let skipped = 0;
  const toInsert: Candidate[] = [];
  const queryErrors: string[] = [];

  for (const query of queries) {
    let candidates: Candidate[];
    try {
      candidates = await findCandidates(query, category);
    } catch (err) {
      queryErrors.push(
        `"${query}": ${err instanceof Error ? err.message : String(err)}`
      );
      continue;
    }
    candidatesFound += candidates.length;

    for (const c of candidates) {
      const emailKey = c.email.toLowerCase();
      const orgNameKey = `${c.organization.toLowerCase()}::${c.name.toLowerCase()}`;
      if (existingEmails.has(emailKey) || existingOrgName.has(orgNameKey)) {
        skipped++;
        continue;
      }
      // Prevent the same contact found again by a later query in this batch.
      existingEmails.add(emailKey);
      existingOrgName.add(orgNameKey);
      toInsert.push(c);
    }
  }

  if (toInsert.length === 0) {
    return NextResponse.json({
      inserted: [],
      skipped,
      candidatesFound,
      error: queryErrors.length > 0 ? queryErrors.join("; ") : undefined,
    });
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
    candidatesFound,
    error: queryErrors.length > 0 ? queryErrors.join("; ") : undefined,
  });
}
