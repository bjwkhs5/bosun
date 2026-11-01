"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">Password updated</h1>
        <Link href="/outreach" className="text-sm text-accent hover:underline">
          Continue to Bosun
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-center text-xl font-semibold">Choose a new password</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">New password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-card-border bg-transparent p-2.5 outline-none focus:border-accent"
          />
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
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
