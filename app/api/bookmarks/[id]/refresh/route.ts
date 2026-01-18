import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchMetadata, isXBookmark, fetchXTitle } from "@/lib/metadata/fetch";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }
  const {
    data: { user }
  } = await supabase.auth.getUser();
  
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify bookmark exists and belongs to user
  const { data: bookmark, error: bookmarkErr } = await supabase
    .from("bookmarks")
    .select("id,url,user_id,title")
    .eq("id", id)
    .single();

  if (bookmarkErr || !bookmark) {
    return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
  }
  if (bookmark.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Skip text notes
  if (bookmark.url.startsWith("note://")) {
    return NextResponse.json({ error: "Cannot refresh metadata for text notes" }, { status: 400 });
  }

  // Check if this is an X bookmark - preserve existing title if it exists
  const isX = isXBookmark(bookmark.url);
  const existingTitle = bookmark.title;

  // For X bookmarks, use fetchXTitle instead of fetchMetadata (better for X)
  let titleToUpdate: string | null = null;
  let metadata = null;

  if (isX) {
    // Try to fetch X title first
    const fetchedXTitle = await fetchXTitle(bookmark.url);
    if (fetchedXTitle && fetchedXTitle.trim() && fetchedXTitle.trim() !== "X") {
      titleToUpdate = fetchedXTitle.trim();
    }
    
    // Still fetch metadata for image/description
    metadata = await fetchMetadata(bookmark.url);
    
    // If fetchXTitle didn't work, check if we should preserve existing title
    if (!titleToUpdate) {
      const isUrlBasedTitle = existingTitle && (existingTitle.startsWith("http") || existingTitle === bookmark.url);
      const isFallbackTitle = existingTitle && (
        existingTitle.trim() === "X" || 
        existingTitle === "X post" ||
        existingTitle.startsWith("Post by @")
      );
      
      // Only preserve if it's not a fallback title
      if (existingTitle && existingTitle.trim() && !isUrlBasedTitle && !isFallbackTitle) {
        titleToUpdate = existingTitle.trim();
      } else if (metadata?.title) {
        titleToUpdate = metadata.title;
      }
    }
  } else {
    // For non-X bookmarks, use regular metadata fetch
    metadata = await fetchMetadata(bookmark.url);
    if (!metadata) {
      return NextResponse.json({ error: "Could not fetch metadata from URL" }, { status: 422 });
    }
    titleToUpdate = metadata.title;
  }

  // Update bookmark with metadata (handle null metadata for X bookmarks)
  const { error: updateErr } = await supabase
    .from("bookmarks")
    .update({
      title: titleToUpdate,
      description: metadata?.description ?? null,
      site_name: metadata?.siteName ?? null,
      image_url: metadata?.imageUrl ?? null,
      content_text: metadata?.contentText ?? null,
    })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Return updated bookmark
  const { data: updated } = await supabase
    .from("bookmarks")
    .select("id,url,title,description,site_name,image_url,notes,created_at")
    .eq("id", id)
    .single();

  // Trigger embedding update after metadata refresh (fire-and-forget)
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
        bookmarkId: id,
        userId: user.id,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ bookmark: updated });
}
