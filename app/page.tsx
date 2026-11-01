import Link from "next/link";

const STEPS = [
  {
    title: "Tell Bosun what you make",
    body: "Your channel, book, podcast, or newsletter — who it reaches and what kind of partnership you want.",
  },
  {
    title: "Find brands that sponsor creators",
    body: "Bosun searches the public web for brands' real partnership and press inboxes that fit your niche, and can re-run your searches every day.",
  },
  {
    title: "Send pitches that sound like you",
    body: "Get a short, specific pitch for each brand. Edit it, attach your media kit, and send it from one review queue.",
  },
];

const AUDIENCES = [
  "YouTubers & streamers",
  "Authors",
  "Podcasters",
  "Newsletter writers",
  "Instagram & TikTok creators",
  "Bloggers",
];

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-base text-accent-foreground"
          >
            ⚓
          </span>
          <span className="text-lg font-semibold tracking-tight">Bosun</span>
        </span>
        <Link href="/login" className="text-sm text-muted hover:text-foreground">
          Sign in
        </Link>
      </header>

      <main className="flex flex-1 flex-col gap-16 py-12 sm:py-20">
        <section className="flex flex-col items-start gap-6">
          <p className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            Sponsorship outreach for creators
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Land brand deals without the cold-email grind.
          </h1>
          <p className="max-w-xl text-base text-muted sm:text-lg">
            Bosun finds brands that partner with creators like you, writes a
            pitch tailored to each one, and keeps every conversation in one
            place, so you can spend your time creating.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              Start pitching brands
            </Link>
            <Link
              href="/outreach"
              className="rounded-md border border-card-border px-5 py-2.5 text-sm font-medium hover:border-accent"
            >
              Open my dashboard
            </Link>
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-muted">
            How it works
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="rounded-xl border border-card-border bg-card p-5"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Built for
          </h2>
          <ul className="flex flex-wrap gap-2">
            {AUDIENCES.map((a) => (
              <li
                key={a}
                className="rounded-full border border-card-border px-3 py-1 text-sm"
              >
                {a}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-card-border bg-card p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">
            No scraping, no guesswork
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Bosun only uses contacts that brands publish themselves, such as
            partnership, press, and creator-program inboxes, and you approve
            every email before it&apos;s sent. Replies go straight to your own
            inbox.
          </p>
          <Link
            href="/signup"
            className="mt-5 inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            Create your account
          </Link>
        </section>
      </main>

      <footer className="border-t border-card-border py-6 text-xs text-muted">
        © {new Date().getFullYear()} Bosun
      </footer>
    </div>
  );
}
