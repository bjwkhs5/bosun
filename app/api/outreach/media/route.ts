import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ALLOWED_ATTACHMENT_TYPES, ATTACHMENTS_BUCKET, MAX_FILE_BYTES } from "@/lib/media";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ mediaAssets: data ?? [] });
}

export async function POST(req: NextRequest) {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Storage writes need the service-role client (the bucket is private with
  // no storage policies), so this handler manually scopes the media_assets
  // insert to `user.id` instead of relying on RLS.
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type as (typeof ALLOWED_ATTACHMENT_TYPES)[number])) {
    return NextResponse.json(
      { error: `Unsupported file type "${file.type || "unknown"}" — use JPEG, PNG, WebP, PDF, or Word docs` },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB) — max 8MB per file` },
      { status: 400 }
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${crypto.randomUUID()}-${safeName}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: asset, error: insertError } = await supabase
    .from("media_assets")
    .insert({
      user_id: user.id,
      file_name: file.name,
      storage_path: storagePath,
      content_type: file.type,
      size_bytes: file.size,
    })
    .select()
    .single();

  if (insertError) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: `Failed to save upload: ${insertError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ mediaAsset: asset });
}
