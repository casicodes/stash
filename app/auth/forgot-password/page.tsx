"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const redirectTo = `${window.location.origin}/auth/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo,
        }
      );
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setStatus("sent");
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-medium">Reset password</h1>
      <p className="mt-1 text-neutral-500">
        {status === "sent"
          ? "Check your inbox for a reset link."
          : "We’ll email you a reset link."}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <input
          className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-zinc-400"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="w-full rounded-xl bg-neutral-800 hover:bg-neutral-700 transition px-3 py-3 text-white disabled:opacity-50"
          type="submit"
          disabled={isPending || status === "sent"}
        >
          Send reset link
        </button>
      </form>

      <div className="mt-6 flex items-center justify-center text-sm text-center">
        <Link
          className="text-neutral-500 hover:text-neutral-800 underline underline-offset-2"
          href="/auth/sign-in"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
