import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Everything else requires a signed-in session. Cron hits are gated by
// their own CRON_SECRET, and the PWA install files need to be reachable
// unauthenticated.
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/manifest.webmanifest",
  "/sw.js",
  "/favicon.ico",
  "/icon.png",
  "/apple-icon.png",
];

/**
 * This only does an optimistic redirect + refreshes the session cookie —
 * per Next's own guidance, Proxy runs on every request (including
 * prefetches) so it should stay cheap and shouldn't be treated as the real
 * authorization boundary. The actual enforcement is two layers deeper:
 * every route/page calls `auth.getUser()` itself before touching data, and
 * Postgres RLS policies are the backstop that holds even if a route ever
 * forgets that check.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/icons/") ||
    PUBLIC_PATHS.includes(pathname)
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
