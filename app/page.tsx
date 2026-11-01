import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <span
        aria-hidden
        className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-3xl text-accent-foreground"
      >
        ⚓
      </span>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bosun</h1>
        <p className="mt-2 text-sm text-muted">
          Your outreach first mate — discover contacts, draft, and send.
        </p>
      </div>
      <Link
        href="/outreach"
        className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
      >
        Open Bosun
      </Link>
    </main>
  );
}
