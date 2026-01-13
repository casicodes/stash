"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <Image
        alt="Stash logo"
        className="mb-6 rounded-xl"
        height={40}
        priority
        src="/icon48.png"
        width={40}
      />
      <h1 className="text-2xl font-medium">Create account</h1>
      <p className="mt-1 text-neutral-500">
        Welcome! Please fill in the details to get started.
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
        <input
          className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-zinc-400"
          placeholder="Password"
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
          Create account
        </button>
      </form>

      <div className="mt-6 flex items-center justify-center text-sm text-center">
        <Link
          className="text-neutral-500 hover:text-neutral-800 underline underline-offset-2"
          href="/auth/sign-in"
        >
          Already have an account? Sign in
        </Link>
      </div>
    </main>
  );
}
