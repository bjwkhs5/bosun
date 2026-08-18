import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params;
  let body: { replied?: boolean; reply_notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.replied !== "boolean") {
    return NextResponse.json({ error: "Missing replied" }, { status: 400 });
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

  const { data, error } = await supabase
    .from("contacts")
    .update({
      status: body.replied ? "replied" : "sent",
      reply_notes: body.reply_notes ?? "",
      replied_at: body.replied ? new Date().toISOString() : null,
    })
    .eq("id", contactId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Failed to update contact: ${error.message}` },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json({ contact: data });
}
