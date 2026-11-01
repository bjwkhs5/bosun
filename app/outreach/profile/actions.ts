"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveProfile(formData: FormData) {
  const bio = String(formData.get("bio") ?? "");
  const book_title = String(formData.get("book_title") ?? "");
  const book_details = String(formData.get("book_details") ?? "");
  const links = String(formData.get("links") ?? "");
  const ask = String(formData.get("ask") ?? "");
  const reply_to_email = String(formData.get("reply_to_email") ?? "").trim() || null;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in");
  }

  const { error } = await supabase
    .from("profile")
    .update({
      bio,
      book_title,
      book_details,
      links,
      ask,
      reply_to_email,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to save profile: ${error.message}`);
  }

  revalidatePath("/outreach/profile");
}
