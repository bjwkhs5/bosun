import { NextRequest, NextResponse } from "next/server";
import { type MediaAsset } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  const { emailId } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("outreach_email_attachments")
    .select("media_assets(*)")
    .eq("email_id", emailId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mediaAssets = (data ?? [])
    .map((row) => row.media_assets as unknown as MediaAsset)
    .filter(Boolean);

  return NextResponse.json({ mediaAssets });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  const { emailId } = await params;

  let body: { mediaAssetId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.mediaAssetId) {
    return NextResponse.json({ error: "Missing mediaAssetId" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: email } = await supabase
    .from("outreach_emails")
    .select("status")
    .eq("id", emailId)
    .single();

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }
  if (email.status === "sent") {
    return NextResponse.json(
      { error: "Can't change attachments on an email that's already sent" },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("outreach_email_attachments")
    .insert({ email_id: emailId, media_asset_id: body.mediaAssetId });

  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  const { emailId } = await params;
  const mediaAssetId = req.nextUrl.searchParams.get("mediaAssetId");
  if (!mediaAssetId) {
    return NextResponse.json({ error: "Missing mediaAssetId" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { error } = await supabase
    .from("outreach_email_attachments")
    .delete()
    .eq("email_id", emailId)
    .eq("media_asset_id", mediaAssetId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
