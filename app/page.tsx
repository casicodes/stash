import BookmarksClient from "@/components/BookmarksClient";
import { createClient, getUser } from "@/lib/supabase/server";

// This page is user-specific (cookie-auth) and should never be statically cached.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  if (!supabase) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Configuration Error</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.
        </p>
      </main>
    );
  }

  // Use cached getUser() for per-request deduplication
  const user = await getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("bookmarks")
    .select(`
      id,
      url,
      title,
      description,
      site_name,
      image_url,
      notes,
      created_at,
      bookmark_tags (tag)
    `)
    .eq("archived", false)
    .order("created_at", { ascending: false })
    .limit(200);

  // Transform bookmark_tags to flat tags array
  const bookmarks = (data ?? []).map((b: any) => ({
    ...b,
    tags: b.bookmark_tags?.map((t: any) => t.tag) ?? [],
    bookmark_tags: undefined,
  }));

  return <BookmarksClient initial={bookmarks} />;
}

