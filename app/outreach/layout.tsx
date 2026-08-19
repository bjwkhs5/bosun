import Link from "next/link";

const links = [
  { href: "/outreach", label: "Dashboard" },
  { href: "/outreach/profile", label: "Profile" },
  { href: "/outreach/discover", label: "Discover" },
  { href: "/outreach/new", label: "Add contact" },
  { href: "/outreach/review", label: "Review & Send" },
];

export default function OutreachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between border-b border-black/10 pb-4 dark:border-white/10">
        <h1 className="text-lg font-semibold">Bosun</h1>
        <nav className="flex gap-4 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-foreground/70 hover:text-foreground hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
