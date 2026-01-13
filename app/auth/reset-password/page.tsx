"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-medium">Choose a new password</h1>
      <p className="mt-1 text-neutral-500">
        Make it long. You won’t have to type it often.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <input
          className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-zinc-400"
          placeholder="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="w-full rounded-xl bg-neutral-800 hover:bg-neutral-700 transition px-3 py-3 text-white disabled:opacity-50"
          type="submit"
          disabled={isPending}
        >
          Update password
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
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
