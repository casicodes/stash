import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeUrl } from "@/lib/url/normalize";
import { detectBookmarkType } from "@/lib/url/detect-type";
import { fetchMetadata } from "@/lib/metadata/fetch";
import { uploadScreenshot } from "@/lib/storage/upload";

const CreateBookmarkSchema = z.object({
  url: z.string().min(1),
  client_title: z.string().min(1).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string().min(1)).optional(),
  image_url: z.string().optional(),
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
  if (!supabase) {
    return null;
  }

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
  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500, headers: corsHeaders() }
    );
  }

  const { searchParams } = new URL(req.url);
  const filterTag = searchParams.get("tag");

  // If filtering by tag, join with bookmark_tags
  if (filterTag) {
    const { data, error } = await supabase
      .from("bookmark_tags")
      .select(
        `
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
      `
      )
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
      .sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    return NextResponse.json({ bookmarks }, { headers: corsHeaders() });
  }

  // Default: fetch all bookmarks with their tags
  const { data, error } = await supabase
    .from("bookmarks")
    .select(
      `
      id,
      url,
      title,
      description,
      site_name,
      image_url,
      notes,
      created_at,
      bookmark_tags (tag)
    `
    )
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
  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500, headers: corsHeaders() }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = CreateBookmarkSchema.safeParse(json);
  if (!parsed.success) {
    console.error("Shelf: Schema validation failed", parsed.error);
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400, headers: corsHeaders() }
    );
  }

  const input = parsed.data.url.trim();
  const explicitTags = parsed.data.tags ?? [];
  const normalized = normalizeUrl(input);
  const isTextNote = !normalized;
  const clientTitle = parsed.data.client_title?.trim() || null;

  // For plain text, generate a unique note:// URL and store content in notes
  const noteId = crypto.randomUUID();
  const urlToStore = isTextNote ? `note://${noteId}` : normalized;
  const notesToStore = isTextNote ? input : parsed.data.notes ?? null;
  const titleToStore = isTextNote ? input.slice(0, 100) : null;

  // For URLs, fetch metadata first
  let metadata = null;
  if (!isTextNote && normalized) {
    metadata = await fetchMetadata(normalized);
  }

  const shouldPreferClientTitleForLinkedIn = (() => {
    if (!clientTitle || !normalized) return false;
    try {
      const { hostname } = new URL(normalized);
      return hostname === "linkedin.com" || hostname.endsWith(".linkedin.com");
    } catch {
      return false;
    }
  })();

  const resolvedTitle =
    isTextNote
      ? titleToStore
      : shouldPreferClientTitleForLinkedIn
        ? clientTitle
        : metadata?.title ?? null;

  // Handle image_url: if it's a base64 data URL, upload to storage first
  let imageUrlToStore = isTextNote
    ? parsed.data.image_url ?? null
    : parsed.data.image_url ?? metadata?.imageUrl ?? null;

  if (imageUrlToStore && imageUrlToStore.startsWith("data:image/")) {
    const uploadedUrl = await uploadScreenshot(imageUrlToStore, user.id);
    if (uploadedUrl) {
      imageUrlToStore = uploadedUrl;
    } else {
      console.error("Shelf: Failed to upload screenshot, storing null");
      imageUrlToStore = null;
    }
  }

  // For LinkedIn URLs, use LinkedIn favicon as fallback if no image found
  if (!imageUrlToStore && !isTextNote && normalized) {
    try {
      const { hostname } = new URL(normalized);
      if (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")) {
        imageUrlToStore = "https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca";
      }
    } catch {
      // Invalid URL, skip favicon fallback
    }
  }

  const insertRes = await supabase
    .from("bookmarks")
    .insert({
      user_id: user.id,
      url: urlToStore,
      normalized_url: urlToStore,
      title: resolvedTitle,
      description: metadata?.description ?? null,
      site_name: metadata?.siteName ?? null,
      image_url: imageUrlToStore,
      notes: notesToStore,
    })
    .select("id,url,title,description,site_name,image_url,notes,created_at")
    .single();

  if (insertRes.error) {
    console.error("Shelf: Database insert error", insertRes.error);
    // Check if it's a duplicate key violation
    const isDuplicate =
      insertRes.error.code === "23505" ||
      insertRes.error.message?.toLowerCase().includes("duplicate") ||
      insertRes.error.message?.toLowerCase().includes("unique constraint");

    if (isDuplicate) {
      return NextResponse.json(
        { error: "DUPLICATE_BOOKMARK" },
        { status: 400, headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      { error: insertRes.error.message },
      { status: 400, headers: corsHeaders() }
    );
  }

  // Auto-tag based on URL type (ignore errors)
  const bookmarkType = detectBookmarkType(urlToStore, isTextNote);
  // If caller supplied tags (e.g. extension), prefer those but always dedupe
  const tagsToInsert = (
    explicitTags.length > 0 ? explicitTags : [bookmarkType]
  ).filter((tag, index, self) => self.indexOf(tag) === index);

  let tags: string[] = [];
  try {
    if (tagsToInsert.length > 0) {
      await supabase.from("bookmark_tags").insert(
        tagsToInsert.map((tag) => ({
          bookmark_id: insertRes.data.id,
          user_id: user.id,
          tag,
        }))
      );
      tags = tagsToInsert;
    }
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
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bookmarkId: insertRes.data.id,
        userId: user.id,
      }),
    }).catch(() => {});
  }

  return NextResponse.json(
    { bookmark: { ...insertRes.data, tags } },
    { headers: corsHeaders() }
  );
}
