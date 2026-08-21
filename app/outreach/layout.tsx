import Link from "next/link";
import OutreachNav from "./OutreachNav";

export default function OutreachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-card-border pb-5">
        <Link href="/outreach" className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-base text-accent-foreground"
          >
            ⚓
          </span>
          <span className="text-lg font-semibold tracking-tight">Bosun</span>
        </Link>
        <OutreachNav />
      </header>
      {children}
    </div>
  );
}
