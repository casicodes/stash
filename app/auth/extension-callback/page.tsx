"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ExtensionCallbackPage() {
  const supabaseRef = useRef<ReturnType<typeof createClient>>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isConnected, setIsConnected] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const extensionReadyRef = useRef(false);
  const handshakeNonceRef = useRef<string | null>(null);

  const sendTokenToExtension = (token: string) => {
    // Only send to same origin, not "*"
    // The extension content script runs in page context and will receive this
    const message: { type: string; token: string; nonce?: string | null } = {
      type: "SHELF_AUTH_TOKEN",
      token,
    };
    
    // Include nonce if handshake was successful
    if (handshakeNonceRef.current) {
      message.nonce = handshakeNonceRef.current;
    }
    
    window.postMessage(message, window.location.origin);
  };

  useEffect(() => {
    // Create client only after mount to avoid SSR/window issues
    supabaseRef.current = createClient();
    if (!supabaseRef.current) {
      setConfigError(
        "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
      );
      setIsCheckingAuth(false);
      return;
    }

    // Set up secure handshake with extension
    function handleExtensionReady(event: MessageEvent) {
      // Only accept messages from same origin
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === "SHELF_EXTENSION_READY") {
        extensionReadyRef.current = true;
        handshakeNonceRef.current = event.data.nonce || null;
      }
    }

    window.addEventListener("message", handleExtensionReady);

    // Initiate handshake - request extension to identify itself
    window.postMessage({ type: "SHELF_EXTENSION_HANDSHAKE" }, window.location.origin);

    // Give extension time to respond (max 2 seconds)
    const handshakeTimeout = setTimeout(() => {
      // If no response, extension might not be installed
      // We'll still try to send token, but with origin restriction
    }, 2000);

    async function checkAuth() {
      const client = supabaseRef.current;
      if (!client) {
        setIsCheckingAuth(false);
        return;
      }

      const {
        data: { session },
      } = await client.auth.getSession();

      const token = session?.access_token;
      if (token) {
        // Wait a bit for handshake if extension is loading
        await new Promise((resolve) => setTimeout(resolve, 100));
        sendTokenToExtension(token);
        setIsConnected(true);
      }
      setIsCheckingAuth(false);
    }

    checkAuth();

    return () => {
      window.removeEventListener("message", handleExtensionReady);
      clearTimeout(handshakeTimeout);
    };
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const client = supabaseRef.current;
    if (!client) return;

    setError(null);
    startTransition(async () => {
      const { data, error: signInError } = await client.auth.signInWithPassword(
        {
          email,
          password,
        }
      );

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const token = data.session?.access_token;
      if (token) {
        sendTokenToExtension(token);
        setIsConnected(true);
      }
    });
  }

  if (configError) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Local setup needed
        </h1>
        <p className="mt-2 text-sm text-zinc-600">{configError}</p>
        <div className="mt-6">
          <Link className="text-zinc-900 hover:underline" href="/auth/sign-in">
            Go to sign in
          </Link>
        </div>
      </main>
    );
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-medium">
          Connected to Shelf
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          You can close this tab and return to the extension.
        </p>
        <button
          onClick={() => window.close()}
          className="w-full h-12 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition px-3 text-white disabled:opacity-50 active:scale-[0.97] flex items-center justify-center relative overflow-hidden"
        >
          Close tab
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-medium">
        Connect extension
      </h1>
      <p className="mt-1 text-neutral-500">
        Connect the Shelf browser extension to your account.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <input
          className="w-full rounded-lg border border-zinc-200 px-3 py-3 outline-none focus:border-zinc-400"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className="w-full rounded-lg border border-zinc-200 px-3 py-3 outline-none focus:border-zinc-400"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

       
        <button
          className="w-full h-12 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition px-3 text-white disabled:opacity-50 active:scale-[0.97] flex items-center justify-center relative overflow-hidden"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Connecting..." : "Connect extension"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
       
        <Link className="text-neutral-500 hover:text-neutral-800 underline underline-offset-2 transition active:scale-[0.97]" href="/auth/sign-up">
        Don&apos;t have an account?{" "}Sign up
        </Link>
      </p>
    </main>
  );
}
