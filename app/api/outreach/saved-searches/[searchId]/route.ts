import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ searchId: string }> }
) {
  const { searchId } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
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
