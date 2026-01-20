"use client";

export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") ?? "";

  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState(emailFromQuery);
  const [status, setStatus] = useState<"idle" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onResend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase) {
      setError(
        "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
      );
      return;
    }
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    startTransition(async () => {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (resendError) {
        setError(resendError.message);
        return;
      }
      setStatus("sent");
    });
  }

  if (!supabase) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <h1 className="text-2xl font-medium">Local setup needed</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Set Supabase env vars to use email verification.
        </p>
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 text-sm">
          <div className="font-medium text-neutral-900">Required</div>
          <ul className="mt-2 list-disc pl-5 text-neutral-700">
            <li>
              <code>NEXT_PUBLIC_SUPABASE_URL</code>
            </li>
            <li>
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
            </li>
          </ul>
          <p className="mt-3 text-neutral-600">
            Copy <code>env.example</code> to <code>.env.local</code>. Then
            restart the dev server.
          </p>
        </div>
        <div className="mt-6">
          <Link
            className="text-sm text-neutral-500 hover:text-neutral-800 underline underline-offset-2 transition active:scale-[0.97]"
            href="/auth/sign-in"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <Image
        alt="Shelf logo"
        className="mb-6 rounded-xl"
        height={40}
        priority
        src="/icon48.png"
        width={40}
      />
      <h1 className="text-2xl font-medium">Verify your email</h1>
      <p className="mt-1 text-neutral-500">
        Use the verification link sent to your email address.
      </p>

      {status === "sent" && (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Verification email sent. Please check your inbox.
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      )}

      <div className="mt-8">
        <p className="text-sm text-neutral-600">

          <button
            onClick={onResend}
            disabled={isPending || status === "sent"}
            className="text-neutral-500 hover:text-neutral-800 underline underline-offset-2 transition active:scale-[0.97]"
          >
            Didn&apos;t receive verification link?{" "} Resend it
          </button>
        </p>
      </div>

      {!emailFromQuery && (
        <form onSubmit={onResend} className="mt-6 space-y-4">
          <input
            className="w-full rounded-xl border border-zinc-200 px-3 py-3 outline-none focus:border-zinc-400"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <button
            className="w-full h-12 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition px-3 text-white disabled:opacity-50 active:scale-[0.97] flex items-center justify-center relative overflow-hidden"
            type="submit"
            disabled={isPending || status === "sent"}
          >
            <AnimatePresence>
              {isPending ? (
                <motion.div
                  key="spinner"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <span className="h-5 w-5 border-2 border-[#e0e0e0] border-t-[#888] rounded-full animate-spin" />
                </motion.div>
              ) : (
                <motion.div
                  key="label"
                  initial={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  Resend verification link
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </form>
      )}

      <div className="mt-6 flex text-sm text-center">
        <Link
          className="text-neutral-500 hover:text-neutral-800 underline underline-offset-2 transition active:scale-[0.97]"
          href="/auth/sign-in"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
