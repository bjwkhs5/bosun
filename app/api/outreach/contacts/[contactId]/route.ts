import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { error } = await supabase.from("contacts").delete().eq("id", contactId);

  if (error) {
    return NextResponse.json(
      { error: `Failed to delete contact: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
