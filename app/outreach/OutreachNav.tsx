"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/outreach", label: "Dashboard" },
  { href: "/outreach/profile", label: "Profile" },
  { href: "/outreach/discover", label: "Discover" },
  { href: "/outreach/new", label: "Add contact" },
  { href: "/outreach/review", label: "Review & Send" },
];

export default function OutreachNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 text-sm">
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
    </nav>
  );
}
