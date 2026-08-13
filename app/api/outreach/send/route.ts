import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendOutreachEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  let body: { emailId?: string; subject?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.emailId) {
    return NextResponse.json({ error: "Missing emailId" }, { status: 400 });
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
  const { data: email, error: fetchError } = await supabase
    .from("outreach_emails")
    .select("*, contacts(*)")
    .eq("id", body.emailId)
    .single();

  if (fetchError || !email) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  if (email.status === "sent") {
    return NextResponse.json({ error: "This email was already sent" }, { status: 409 });
  }

  const contact = email.contacts as { email: string | null; id: string };
  if (!contact.email) {
    return NextResponse.json(
      { error: "This contact has no email address on file — add one before sending" },
      { status: 400 }
    );
  }

  const subject = body.subject ?? email.subject;
  const text = body.body ?? email.body;

  await supabase
    .from("outreach_emails")
    .update({ subject, body: text, status: "approved" })
    .eq("id", body.emailId);

  try {
    await sendOutreachEmail({ to: contact.email, subject, text });
  } catch (err) {
    const errText = err instanceof Error ? err.message : String(err);
    await supabase
      .from("outreach_emails")
      .update({ status: "failed", error: errText.slice(0, 500) })
      .eq("id", body.emailId);
    return NextResponse.json(
      { error: `Send failed: ${errText.slice(0, 300)}` },
      { status: 502 }
    );
  }

  const { data: sentEmail } = await supabase
    .from("outreach_emails")
    .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
    .eq("id", body.emailId)
    .select()
    .single();

  await supabase.from("contacts").update({ status: "sent" }).eq("id", contact.id);

  return NextResponse.json({ email: sentEmail });
}
