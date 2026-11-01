import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ATTACHMENTS_BUCKET } from "@/lib/media";

export async function DELETE(
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

  // Storage deletes need the service-role client — manually scope the
  // lookup to this user instead of relying on RLS.
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
    .select("storage_path")
    .eq("id", assetId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await supabase.storage.from(ATTACHMENTS_BUCKET).remove([asset.storage_path]);

  const { error: deleteError } = await supabase
    .from("media_assets")
    .delete()
    .eq("id", assetId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
