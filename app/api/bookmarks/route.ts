import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeUrl } from "@/lib/url/normalize";
import { detectBookmarkType } from "@/lib/url/detect-type";
import { fetchMetadata } from "@/lib/metadata/fetch";

const CreateBookmarkSchema = z.object({
  url: z.string().min(1),
  notes: z.string().optional(),
  tags: z.array(z.string().min(1)).optional()
});

// CORS headers for browser extension
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// Get user from Bearer token (extension) or cookie auth (web app)
async function getAuthenticatedUser(req: Request) {
  const supabase = await createClient();
  const authHeader = req.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data } = await supabase.auth.getUser(token);
    return data.user;
  }

  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders() }
    );
  }

  const supabase = await createClient();

  const { searchParams } = new URL(req.url);
  const filterTag = searchParams.get("tag");

  // If filtering by tag, join with bookmark_tags
  if (filterTag) {
    const { data, error } = await supabase
      .from("bookmark_tags")
      .select(`
        tag,
        bookmarks:bookmark_id (
          id,
          url,
          title,
          description,
          site_name,
          image_url,
          notes,
          created_at,
          archived
        )
      `)
      .eq("tag", filterTag)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: corsHeaders() }
      );
    }

    // Flatten and filter archived
    const bookmarks = (data ?? [])
      .map((row: any) => ({ ...row.bookmarks, tags: [row.tag] }))
      .filter((b: any) => b && !b.archived)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ bookmarks }, { headers: corsHeaders() });
  }

  // Default: fetch all bookmarks with their tags
  const { data, error } = await supabase
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

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }

  // Transform tags array
  const bookmarks = (data ?? []).map((b: any) => ({
    ...b,
    tags: b.bookmark_tags?.map((t: any) => t.tag) ?? [],
    bookmark_tags: undefined,
  }));

  return NextResponse.json({ bookmarks }, { headers: corsHeaders() });
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders() }
    );
  }

  const supabase = await createClient();

  const json = await req.json().catch(() => null);
  const parsed = CreateBookmarkSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400, headers: corsHeaders() }
    );
  }

  const input = parsed.data.url.trim();
  const normalized = normalizeUrl(input);
  const isTextNote = !normalized;

  // For plain text, generate a unique note:// URL and store content in notes
  const noteId = crypto.randomUUID();
  const urlToStore = isTextNote ? `note://${noteId}` : normalized;
  const notesToStore = isTextNote ? input : (parsed.data.notes ?? null);
  const titleToStore = isTextNote ? input.slice(0, 100) : null;

  // For URLs, fetch metadata first
  let metadata = null;
  if (!isTextNote && normalized) {
    metadata = await fetchMetadata(normalized);
  }

  const insertRes = await supabase
    .from("bookmarks")
    .insert({
      user_id: user.id,
      url: urlToStore,
      normalized_url: urlToStore,
      title: isTextNote ? titleToStore : (metadata?.title ?? null),
      description: metadata?.description ?? null,
      site_name: metadata?.siteName ?? null,
      image_url: metadata?.imageUrl ?? null,
      notes: notesToStore
    })
    .select("id,url,title,description,site_name,image_url,notes,created_at")
    .single();

  if (insertRes.error) {
    // likely duplicate
    return NextResponse.json(
      { error: insertRes.error.message },
      { status: 400, headers: corsHeaders() }
    );
  }

  // Auto-tag based on URL type (ignore errors)
  const bookmarkType = detectBookmarkType(urlToStore, isTextNote);
  let tags: string[] = [];
  try {
    await supabase
      .from("bookmark_tags")
      .insert({
        bookmark_id: insertRes.data.id,
        user_id: user.id,
        tag: bookmarkType,
      });
    tags = [bookmarkType];
  } catch {
    // Ignore tag insert errors
  }

  // Fire-and-forget embedding via Supabase Edge Function
  const fnUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/embedding_upsert`
    : null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (fnUrl && serviceRoleKey) {
    fetch(fnUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        bookmarkId: insertRes.data.id,
        userId: user.id
      })
    }).catch(() => {});
  }

  return NextResponse.json(
    { bookmark: { ...insertRes.data, tags } },
    { headers: corsHeaders() }
  );
}

