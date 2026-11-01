import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * RLS-respecting Supabase client for Server Components, Route Handlers, and
 * Server Actions — reads use the caller's own session, so Postgres RLS
 * policies (not app code) are what enforce per-user data isolation.
 *
 * Server Components can't write cookies at all (Next no-ops/throws), so
 * `setAll` is wrapped in try/catch there. Only the proxy and Server
 * Actions/Route Handlers actually persist a refreshed session cookie.
 */
export async function createServerSupabaseClient() {
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component render — expected, no-op.
        }
      },
    },
  });
}
