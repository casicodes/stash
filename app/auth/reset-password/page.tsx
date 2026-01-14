"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [temporarilyShowPassword, setTemporarilyShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const passwordTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevPasswordLengthRef = useRef(0);

  useEffect(() => {
    if (password.length > prevPasswordLengthRef.current && !showPassword) {
      // New character was added
      // Clear existing timeout
      if (passwordTimeoutRef.current) {
        clearTimeout(passwordTimeoutRef.current);
      }

      // Temporarily show the last character
      setTemporarilyShowPassword(true);

      // Hide it after 300ms
      passwordTimeoutRef.current = setTimeout(() => {
        setTemporarilyShowPassword(false);
      }, 300);
    } else if (password.length < prevPasswordLengthRef.current) {
      // Character was deleted, hide the reveal
      setTemporarilyShowPassword(false);
      if (passwordTimeoutRef.current) {
        clearTimeout(passwordTimeoutRef.current);
      }
    }

    prevPasswordLengthRef.current = password.length;

    return () => {
      if (passwordTimeoutRef.current) {
        clearTimeout(passwordTimeoutRef.current);
      }
    };
  }, [password, showPassword]);

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
        <div className="relative">
          <input
            className="w-full rounded-xl border border-zinc-200 px-3 py-3 pr-10 outline-none focus:border-zinc-400"
            placeholder="New password"
            type={showPassword || temporarilyShowPassword ? "text" : "password"}
            value={
              showPassword
                ? password
                : temporarilyShowPassword && password.length > 0
                ? "•".repeat(password.length - 1) +
                  password[password.length - 1]
                : password
            }
            onChange={(e) => {
              const newValue = e.target.value;
              if (
                temporarilyShowPassword &&
                !showPassword &&
                password.length > 0
              ) {
                // When showing dots + last char, extract the actual password
                if (newValue.length > password.length) {
                  // New character - it's the last visible one
                  const lastChar = newValue.slice(-1);
                  if (lastChar && lastChar !== "•") {
                    setPassword(password + lastChar);
                  }
                } else if (newValue.length < password.length) {
                  // Deletion
                  setPassword(password.slice(0, -1));
                }
              } else {
                setPassword(newValue);
              }
            }}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition active:scale-[0.97]"
          >
            {showPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="w-full h-12 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition px-3 text-white disabled:opacity-50 active:scale-[0.97] flex items-center justify-center"
          type="submit"
          disabled={isPending}
        >
          {isPending ? (
            <span className="h-5 w-5 border-2 border-[#e0e0e0] border-t-[#888] rounded-full animate-spin" />
          ) : (
            "Update password"
          )}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
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
