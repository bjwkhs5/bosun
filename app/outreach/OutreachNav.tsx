"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const links = [
  { href: "/outreach", label: "Dashboard" },
  { href: "/outreach/profile", label: "Profile" },
  { href: "/outreach/discover", label: "Discover" },
  { href: "/outreach/new", label: "Add contact" },
  { href: "/outreach/media", label: "Media" },
  { href: "/outreach/review", label: "Review & Send" },
];

export default function OutreachNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      {links.map((link) => {
        const isActive =
          link.href === "/outreach" ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-3 py-1.5 transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:bg-accent-soft hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      <button
        onClick={signOut}
        className="rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-foreground"
      >
        Sign out
      </button>
    </nav>
  );
}
