import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  const { emailId } = await params;
  let body: { subject?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("outreach_emails")
    .update({
      ...(body.subject !== undefined ? { subject: body.subject } : {}),
      ...(body.body !== undefined ? { body: body.body } : {}),
    })
    .eq("id", emailId)
    .eq("status", "draft")
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Failed to update draft: ${error.message}` },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "Draft not found or already sent" },
      { status: 404 }
    );
  }

  return NextResponse.json({ email: data });
}
