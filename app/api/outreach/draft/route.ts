import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { runCompletion, extractJson } from "@/lib/groq";

interface Draft {
  subject: string;
  body: string;
}

const CATEGORY_INSTRUCTIONS = {
  brand_marketing:
    "Write a short, professional brand-partnership pitch email. Lead with a " +
    "concrete hook (who he is + the specific angle relevant to this brand), " +
    "state the ask plainly, back it with 1-2 credibility points from his bio, " +
    "include his links, and close with a clear, low-friction next step. Keep " +
    "it under 200 words. No hype language, no exclamation points, no generic " +
    'flattery like "I\'ve always loved your brand."',
  literary_agent:
    "Write a standard literary query letter addressed to this agent. Open " +
    "with the hook/premise of the book, then a short paragraph with title, " +
    "genre, and comp titles if inferable, then a brief bio paragraph, then a " +
    "polite close. Follow this agent's stated submission preferences if any " +
    "are noted. Keep it under 300 words and avoid clichés like " +
    '"I am seeking representation for my novel, working title..." as an ' +
    "opening line — start with the story hook instead.",
  grants_partnerships:
    "Write a short, professional partnership/grant-inquiry email to this " +
    "organization. Open by naming the specific program or opportunity (from " +
    "the notes) and why he's a fit, state the ask clearly (funding, " +
    "sponsorship, or partnership), back it with 1-2 credibility points from " +
    "his bio, mention any deadline noted if relevant, include his links, and " +
    "close with a clear next step (e.g. willingness to submit a full " +
    "application or send more materials). Keep it under 200 words, " +
    "professional and specific — no generic flattery.",
} as const;

export async function POST(req: NextRequest) {
  let body: { contactId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const contactId = body.contactId;
  if (!contactId) {
    return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
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

  const [{ data: contact, error: contactError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase.from("contacts").select("*").eq("id", contactId).single(),
      supabase.from("profile").select("*").eq("id", 1).single(),
    ]);

  if (contactError || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Profile not set up yet — fill it in on the Profile tab first" },
      { status: 400 }
    );
  }

  let draft: Draft;
  try {
    const systemInstruction =
      CATEGORY_INSTRUCTIONS[
        contact.category as keyof typeof CATEGORY_INSTRUCTIONS
      ] +
      ' Respond with ONLY JSON (no markdown fences): {"subject": string, "body": string}. ' +
      "The body should be plain text with blank lines between " +
      "paragraphs, ready to paste into an email client — no signature " +
      "block needed beyond his name.";

    const userContent = [
      `Sender bio: ${profile.bio}`,
      `Book title: ${profile.book_title}`,
      `Book details: ${profile.book_details}`,
      `Links: ${profile.links}`,
      `What the sender wants: ${profile.ask}`,
      "---",
      `Recipient name: ${contact.name || "(unknown, use a generic greeting)"}`,
      `Recipient title: ${contact.title}`,
      `Recipient organization: ${contact.organization}`,
      `Notes about recipient: ${contact.notes}`,
    ].join("\n");

    const text = await runCompletion(systemInstruction, userContent);
    draft = extractJson<Draft>(text);
    if (!draft.subject || !draft.body) throw new Error("Model returned incomplete draft");
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Draft generation failed: " +
          (err instanceof Error ? err.message : String(err)),
      },
      { status: 502 }
    );
  }

  const { data: emailRow, error: insertError } = await supabase
    .from("outreach_emails")
    .insert({
      contact_id: contactId,
      subject: draft.subject,
      body: draft.body,
      status: "draft",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: `Failed to save draft: ${insertError.message}` },
      { status: 500 }
    );
  }

  if (contact.status === "new") {
    await supabase.from("contacts").update({ status: "drafted" }).eq("id", contactId);
  }

  return NextResponse.json({ email: emailRow });
}
