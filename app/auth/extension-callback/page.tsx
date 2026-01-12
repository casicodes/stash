"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ExtensionCallbackPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isConnected, setIsConnected] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        sendTokenToExtension(session.access_token);
        setIsConnected(true);
      }
      setIsCheckingAuth(false);
    }
    checkAuth();
  }, [supabase]);

  function sendTokenToExtension(token: string) {
    // Send token to extension via postMessage
    // The extension listens for this message
    window.postMessage({ type: "STASH_AUTH_TOKEN", token }, "*");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      if (data.session?.access_token) {
        sendTokenToExtension(data.session.access_token);
        setIsConnected(true);
      }
    });
  }

  if (isCheckingAuth) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
      </main>
    );
  }

  if (isConnected) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Connected to Stash</h1>
        <p className="mt-2 text-sm text-zinc-600">
          You can close this tab and return to the extension.
        </p>
        <button
          onClick={() => window.close()}
          className="mt-6 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white"
        >
          Close tab
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Connect extension</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Sign in to connect the Stash browser extension to your account.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        <input
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="w-full rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Connecting..." : "Connect extension"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        Don't have an account?{" "}
        <Link className="text-zinc-900 hover:underline" href="/auth/sign-up">
          Sign up
        </Link>
      </p>
    </main>
  );
}
