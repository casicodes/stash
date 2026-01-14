import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Only access env vars in browser to avoid build-time evaluation
  if (typeof window === "undefined") {
    // During build/SSR, return a no-op client
    // This prevents build-time errors while still allowing the page to be dynamic
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createBrowserClient(url, anonKey);
}

