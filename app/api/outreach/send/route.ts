import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, type MediaAsset } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendOutreachEmail } from "@/lib/email";
import { ATTACHMENTS_BUCKET, MAX_TOTAL_ATTACHMENT_BYTES, formatBytes } from "@/lib/media";

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

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profile")
    .select("reply_to_email")
    .single();

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

  const { data: attachmentRows, error: attachmentsError } = await supabase
    .from("outreach_email_attachments")
    .select("media_assets(*)")
    .eq("email_id", body.emailId);

  if (attachmentsError) {
    return NextResponse.json(
      { error: `Failed to load attachments: ${attachmentsError.message}` },
      { status: 500 }
    );
  }

  const mediaAssets = (attachmentRows ?? [])
    .map((row) => row.media_assets as unknown as MediaAsset)
    .filter(Boolean);

  const totalBytes = mediaAssets.reduce((sum, a) => sum + a.size_bytes, 0);
  if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
    return NextResponse.json(
      {
        error: `Attachments total ${formatBytes(totalBytes)}, over the ${formatBytes(
          MAX_TOTAL_ATTACHMENT_BYTES
        )} limit — remove one before sending`,
      },
      { status: 400 }
    );
  }

  // The attachments query above already proved (via RLS) that every one of
  // these media assets belongs to this user, so it's safe to fetch the
  // actual bytes with the service-role client — the private bucket has no
  // storage policies, so only that client can read it at all.
  let attachments: { filename: string; content: Buffer }[] = [];
  try {
    const storageAdmin = getSupabaseAdmin();
    attachments = await Promise.all(
      mediaAssets.map(async (asset) => {
        const { data: file, error: downloadError } = await storageAdmin.storage
          .from(ATTACHMENTS_BUCKET)
          .download(asset.storage_path);
        if (downloadError || !file) {
          throw new Error(`Couldn't load attachment "${asset.file_name}"`);
        }
        return {
          filename: asset.file_name,
          content: Buffer.from(await file.arrayBuffer()),
        };
      })
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  await supabase
    .from("outreach_emails")
    .update({ subject, body: text, status: "approved" })
    .eq("id", body.emailId);

  try {
    await sendOutreachEmail({
      to: contact.email,
      subject,
      text,
      attachments,
      replyTo: profile?.reply_to_email,
    });
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
