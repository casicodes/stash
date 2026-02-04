import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

/**
 * Creates a Supabase client for server-side use with cookie-based auth.
 * Wrapped with React.cache() for per-request deduplication - multiple calls
 * within the same request will return the same client instance.
 *
 * @see https://react.dev/reference/react/cache
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Return null instead of throwing to allow graceful error handling
    // This prevents 500 errors when env vars are missing
    return null;
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // ignore; setAll can't run in some Server Component contexts
        }
      },
    },
  });
});

/**
 * Get the current authenticated user. Cached per-request to avoid
 * multiple auth.getUser() calls within the same request.
 *
 * @see https://react.dev/reference/react/cache
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Creates an authenticated Supabase client using a Bearer token.
 * This is needed for extension requests that use Bearer tokens instead of cookies.
 * The client will be authenticated as the user whose token is provided.
 */
export function createAuthenticatedClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createSupabaseClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
