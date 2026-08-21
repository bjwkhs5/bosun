import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ searchId: string }> }
) {
  const { searchId } = await params;

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  const { error } = await supabase.from("saved_searches").delete().eq("id", searchId);

  if (error) {
    return NextResponse.json(
      { error: `Failed to delete saved search: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
