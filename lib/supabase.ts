import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseAdmin() {
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export type ContactCategory = "brand_marketing" | "literary_agent";
export type ContactStatus =
  | "new"
  | "drafted"
  | "approved"
  | "sent"
  | "replied"
  | "rejected";
export type EmailStatus = "draft" | "approved" | "sent" | "failed";

export interface Profile {
  id: number;
  bio: string;
  book_title: string;
  book_details: string;
  links: string;
  ask: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  organization: string;
  category: ContactCategory;
  email: string | null;
  source_url: string | null;
  notes: string;
  status: ContactStatus;
  reply_notes: string;
  replied_at: string | null;
  created_at: string;
}

export interface OutreachEmail {
  id: string;
  contact_id: string;
  subject: string;
  body: string;
  status: EmailStatus;
  graph_message_id: string | null;
  error: string | null;
  created_at: string;
  sent_at: string | null;
}
