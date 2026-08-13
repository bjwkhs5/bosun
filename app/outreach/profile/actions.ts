"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function saveProfile(formData: FormData) {
  const bio = String(formData.get("bio") ?? "");
  const book_title = String(formData.get("book_title") ?? "");
  const book_details = String(formData.get("book_details") ?? "");
  const links = String(formData.get("links") ?? "");
  const ask = String(formData.get("ask") ?? "");

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("profile")
    .update({
      bio,
      book_title,
      book_details,
      links,
      ask,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    throw new Error(`Failed to save profile: ${error.message}`);
  }

  revalidatePath("/outreach/profile");
}
