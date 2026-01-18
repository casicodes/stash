import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // In local dev, allow the app to boot even when Supabase isn't configured yet.
  // Call sites should handle null and show a setup message.
  if (!url || !anonKey) return null;

  return createBrowserClient(url, anonKey);
}

