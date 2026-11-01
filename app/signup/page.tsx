"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(
        error.code === "over_email_send_rate_limit" ||
          /rate limit/i.test(error.message)
          ? "Too many confirmation emails have been sent recently. Please wait a while and try again."
          : error.message
      );
      setBusy(false);
      return;
    }
    // If email confirmation is off, Supabase returns an active session
    // immediately and there's nothing further to wait for.
    if (data.session) {
      window.location.href = "/outreach";
      return;
    }
    setDone(true);
    setBusy(false);
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
        <span
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-2xl text-accent-foreground"
        >
          ⚓
        </span>
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-muted">
          We sent a confirmation link to {email}. Click it to finish creating
          your account.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <span
          aria-hidden
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-2xl text-accent-foreground"
        >
          ⚓
        </span>
        <h1 className="mt-3 text-xl font-semibold">Create your Bosun account</h1>
        <p className="mt-1.5 text-sm text-muted">
          Start pitching brands that sponsor creators like you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-card-border bg-transparent p-2.5 outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-card-border bg-transparent p-2.5 outline-none focus:border-accent"
          />
          <span className="text-xs text-muted">At least 6 characters.</span>
        </label>

        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
