import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ATTACHMENTS_BUCKET } from "@/lib/media";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;

  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Storage downloads need the service-role client (private bucket, no
  // storage policies) — manually scope the lookup to this user instead of
  // relying on RLS, which doesn't apply to this client.
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  const { data: asset, error: fetchError } = await supabase
    .from("media_assets")
    .select("*")
    .eq("id", assetId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .download(asset.storage_path);

  if (downloadError || !file) {
    return NextResponse.json({ error: "File missing from storage" }, { status: 404 });
  }

  const bytes = await file.arrayBuffer();
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": asset.content_type,
      "Content-Disposition": `inline; filename="${asset.file_name.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
