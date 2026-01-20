"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function handleCallback() {
      if (!supabase) {
        router.push("/auth/sign-in");
        return;
      }

      // Get the code from URL params (Supabase includes this in verification links)
      const code = searchParams.get("code");
      
      if (code) {
        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          // If there's an error, redirect to sign-in
          router.push("/auth/sign-in");
          return;
        }

        // After successful code exchange, check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // User is authenticated after verification, redirect to home
          router.push("/");
          router.refresh();
        } else {
          // User not authenticated, redirect to sign-in with email autofilled
          const email = data.user?.email;
          if (email) {
            router.push(`/auth/sign-in?email=${encodeURIComponent(email)}`);
          } else {
            router.push("/auth/sign-in");
          }
        }
      } else {
        // Check if user is already authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.email) {
          // User is authenticated, redirect to home
          router.push("/");
        } else {
          // No code and not authenticated, redirect to sign-in
          router.push("/auth/sign-in");
        }
      }
    }

    handleCallback();
  }, [supabase, router, searchParams]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallback />
    </Suspense>
  );
}
