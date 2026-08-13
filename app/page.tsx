import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Writer AI is working ✅</h1>
      <p>
        If you can see this text, your Next.js app is running and your code
        changes are working.
      </p>
      <p>
        <Link href="/outreach">Open the outreach assistant →</Link>
      </p>
    </main>
  );
}
