import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAuthenticatedClient } from "@/lib/supabase/server";
import { normalizeUrl } from "@/lib/url/normalize";
import { detectBookmarkType } from "@/lib/url/detect-type";
import { fetchMetadata, isXBookmark, fetchXTitle } from "@/lib/metadata/fetch";
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
// Returns both the user and the access token (if Bearer token was used)
async function getAuthenticatedUser(
  req: Request,
): Promise<{ user: any; accessToken: string | null } | null> {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const authHeader = req.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data } = await supabase.auth.getUser(token);
    if (data.user) {
      return { user: data.user, accessToken: token };
    }
    return null;
  }

  const { data } = await supabase.auth.getUser();
  if (data.user) {
    return { user: data.user, accessToken: null };
  }
  return null;
}

export async function GET(req: Request) {
  const authResult = await getAuthenticatedUser(req);
  if (!authResult) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders() },
    );
  }

  const { user, accessToken } = authResult;

  // Use authenticated client if Bearer token, otherwise use cookie-based client
  const supabase = accessToken
    ? createAuthenticatedClient(accessToken)
    : await createClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500, headers: corsHeaders() },
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
      `,
      )
      .eq("tag", filterTag)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: corsHeaders() },
      );
    }

    // Flatten and filter archived
    const bookmarks = (data ?? [])
      .map((row: any) => ({ ...row.bookmarks, tags: [row.tag] }))
      .filter((b: any) => b && !b.archived)
      .sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
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
    `,
    )
    .eq("archived", false)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders() },
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
  console.log("=== Shelf API POST called ===");

  const authResult = await getAuthenticatedUser(req);
  if (!authResult) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders() },
    );
  }

  const { user, accessToken } = authResult;

  // Use authenticated client if Bearer token, otherwise use cookie-based client
  // This is critical for RLS policies to work correctly with extension requests
  const supabase = accessToken
    ? createAuthenticatedClient(accessToken)
    : await createClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500, headers: corsHeaders() },
    );
  }

  const json = await req.json().catch(() => null);
  console.log("=== Shelf API POST called ===");
  console.log(
    "Shelf API: Raw request body client_title:",
    json?.client_title?.substring(0, 100),
  );
  console.log("Shelf API: client_title exists:", !!json?.client_title);
  console.log("Shelf API: client_title type:", typeof json?.client_title);
  console.log(
    "Shelf API: client_title length:",
    json?.client_title?.length || 0,
  );
  console.log("Shelf API: Full request body keys:", Object.keys(json || {}));
  console.log(
    "Shelf API: Full request body:",
    JSON.stringify(json, null, 2).substring(0, 500),
  );

  const parsed = CreateBookmarkSchema.safeParse(json);
  if (!parsed.success) {
    console.error("Shelf: Schema validation failed", parsed.error);
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400, headers: corsHeaders() },
    );
  }

  const input = parsed.data.url.trim();
  const explicitTags = parsed.data.tags ?? [];
  const normalized = normalizeUrl(input);
  const isTextNote = !normalized;
  const clientTitle = parsed.data.client_title?.trim() || null;

  console.log("Shelf API: Received bookmark request", {
    url: normalized,
    hasClientTitle: !!clientTitle,
    clientTitle: clientTitle?.substring(0, 100), // Log first 100 chars
  });

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

  const shouldPreferClientTitleForLinkedIn = (() => {
    if (!clientTitle || !normalized) return false;
    try {
      const { hostname } = new URL(normalized);
      return hostname === "linkedin.com" || hostname.endsWith(".linkedin.com");
    } catch {
      return false;
    }
  })();

  // Check if this is an X bookmark - use detectBookmarkType for consistency (it's already detecting X correctly)
  let isX = false;
  if (!isTextNote) {
    // Use the same detection method that's used for tagging
    const bookmarkType = detectBookmarkType(
      normalized || input || urlToStore,
      isTextNote,
    );
    isX = bookmarkType === "x";
    console.log("Shelf API: X detection using detectBookmarkType", {
      bookmarkType,
      isX,
      url: normalized || input || urlToStore,
      normalized,
      input: input?.substring(0, 100),
    });
  }

  console.log("Shelf API: Final X bookmark detection result", {
    isX,
    isTextNote,
    normalized,
    input: input?.substring(0, 100),
  });

  // Determine final title - SIMPLIFIED: clientTitle has highest priority
  let finalTitle: string | null = null;

  console.log("Shelf API: [TITLE DEBUG] Starting title determination", {
    isTextNote,
    isX,
    hasClientTitle: !!clientTitle,
    clientTitle: clientTitle?.substring(0, 150),
    hasMetadata: !!metadata,
    metadataTitle: metadata?.title,
  });

  // Validate clientTitle - must be non-empty and not just "X"
  const isValidClientTitle =
    clientTitle && clientTitle.trim() && clientTitle.trim() !== "X";

  console.log("Shelf API: [TITLE DEBUG] clientTitle validation", {
    clientTitle: clientTitle?.substring(0, 200),
    clientTitleLength: clientTitle?.length || 0,
    trimmedClientTitle: clientTitle?.trim(),
    trimmedLength: clientTitle?.trim()?.length || 0,
    isValidClientTitle,
    isTextNote,
    isX,
  });

  if (isTextNote) {
    finalTitle = titleToStore;
    console.log(
      "Shelf API: [TITLE DEBUG] Text note - using titleToStore:",
      finalTitle,
    );
  } else if (isValidClientTitle) {
    // PRIORITY 1: If we have a valid clientTitle, use it immediately (highest priority)
    // This is especially important for X bookmarks where client-side extraction is most reliable
    finalTitle = clientTitle.trim();
    console.log(
      "Shelf API: [TITLE DEBUG] Using clientTitle (highest priority):",
      finalTitle.substring(0, 150),
    );
    console.log("Shelf API: [TITLE DEBUG] finalTitle set to:", finalTitle);
    console.log("Shelf API: [TITLE DEBUG] finalTitle type:", typeof finalTitle);
    console.log(
      "Shelf API: [TITLE DEBUG] finalTitle length:",
      finalTitle.length,
    );
  } else if (isX) {
    // For X bookmarks without clientTitle, try to fetch server-side
    console.log(
      "Shelf API: [TITLE DEBUG] X bookmark without clientTitle, fetching server-side",
    );
    let fetchedTitle: string | null = null;
    if (normalized) {
      console.log(
        "Shelf API: [TITLE DEBUG] Calling fetchXTitle with:",
        normalized,
      );
      fetchedTitle = await fetchXTitle(normalized);
      console.log(
        "Shelf API: [TITLE DEBUG] fetchXTitle result:",
        fetchedTitle?.substring(0, 150),
      );
    }

    if (fetchedTitle && fetchedTitle.trim() && fetchedTitle.trim() !== "X") {
      finalTitle = fetchedTitle.trim();
      console.log(
        "Shelf API: [TITLE DEBUG] Using fetchXTitle result:",
        finalTitle?.substring(0, 150),
      );
    } else {
      // Last resort: use metadata title if available
      finalTitle = metadata?.title?.trim() || null;
      console.log(
        "Shelf API: [TITLE DEBUG] Using metadata title as fallback:",
        finalTitle?.substring(0, 150),
      );
    }
  } else if (shouldPreferClientTitleForLinkedIn && clientTitle) {
    finalTitle = clientTitle;
    console.log(
      "Shelf API: [TITLE DEBUG] LinkedIn - using clientTitle:",
      finalTitle?.substring(0, 150),
    );
  } else {
    // Default: use metadata title, fall back to clientTitle if available
    finalTitle = metadata?.title ?? null;
    console.log(
      "Shelf API: [TITLE DEBUG] Default - using metadata title:",
      finalTitle?.substring(0, 150),
    );

    if (!finalTitle && isValidClientTitle) {
      finalTitle = clientTitle.trim();
      console.log(
        "Shelf API: [TITLE DEBUG] No metadata title, using clientTitle:",
        finalTitle?.substring(0, 150),
      );
    }
  }

  console.log(
    "Shelf API: [TITLE DEBUG] finalTitle after determination:",
    finalTitle?.substring(0, 150),
  );

  // Handle image_url: if it's a base64 data URL, upload to storage first
  let imageUrlToStore = isTextNote
    ? (parsed.data.image_url ?? null)
    : (parsed.data.image_url ?? metadata?.imageUrl ?? null);

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
        imageUrlToStore =
          "https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca";
      }
    } catch {
      // Invalid URL, skip favicon fallback
    }
  }

  // Prepare insert data - CRITICAL: clientTitle has absolute highest priority
  let titleToInsert: string | null = null;

  // PRIORITY 1: If we have a valid clientTitle, use it directly (no questions asked)
  if (isValidClientTitle) {
    titleToInsert = clientTitle.trim();
    console.log(
      "Shelf API: [TITLE DEBUG] Using clientTitle directly (highest priority):",
      titleToInsert.substring(0, 150),
    );
  }
  // PRIORITY 2: Use finalTitle if it's valid
  else if (finalTitle && finalTitle.trim() && finalTitle.trim() !== "X") {
    titleToInsert = finalTitle.trim();
    console.log(
      "Shelf API: [TITLE DEBUG] Using finalTitle:",
      titleToInsert.substring(0, 150),
    );
  }

  console.log("Shelf API: [TITLE DEBUG] After title processing", {
    isValidClientTitle,
    finalTitle: finalTitle?.substring(0, 150),
    titleToInsert: titleToInsert?.substring(0, 150),
    isX,
    hasClientTitle: !!clientTitle,
    clientTitle: clientTitle?.substring(0, 150),
    clientTitleLength: clientTitle?.length || 0,
  });

  // For X bookmarks, ensure we always have a title - use URL as last resort
  if (isX && !titleToInsert) {
    console.error(
      "Shelf API: [TITLE DEBUG] WARNING - X bookmark has no valid title, using URL as fallback",
      {
        clientTitle: clientTitle?.substring(0, 150),
        finalTitle: finalTitle?.substring(0, 150),
        metadataTitle: metadata?.title?.substring(0, 150),
        normalized,
      },
    );

    // Try to extract username from URL path
    const urlToParse = normalized || input;
    if (urlToParse) {
      try {
        const urlObj = new URL(urlToParse);
        const pathParts = urlObj.pathname.split("/").filter(Boolean);
        if (
          pathParts.length >= 1 &&
          pathParts[0] &&
          pathParts[0] !== "home" &&
          pathParts[0] !== "explore"
        ) {
          titleToInsert = `Post by @${pathParts[0]}`;
          console.log(
            "Shelf API: [TITLE DEBUG] Generated title from URL path:",
            titleToInsert,
          );
        } else {
          titleToInsert = "X post";
          console.log("Shelf API: [TITLE DEBUG] Using generic X post title");
        }
      } catch (e) {
        console.error(
          "Shelf API: [TITLE DEBUG] Failed to parse URL for fallback title",
          e,
        );
        titleToInsert = "X post";
      }
    } else {
      titleToInsert = "X post";
      console.log(
        "Shelf API: [TITLE DEBUG] No URL available, using generic title",
      );
    }
  }

  // CRITICAL FINAL CHECK: If we still don't have a title but have clientTitle, use it
  if (!titleToInsert && isValidClientTitle) {
    console.error(
      "Shelf API: [TITLE DEBUG] CRITICAL - titleToInsert is null but we have valid clientTitle! Using it now.",
    );
    titleToInsert = clientTitle.trim();
  }

  console.log("Shelf API: [TITLE DEBUG] FINAL VALUES BEFORE INSERT", {
    isX,
    isTextNote,
    isValidClientTitle,
    hasClientTitle: !!clientTitle,
    clientTitle: clientTitle?.substring(0, 200),
    clientTitleFull: clientTitle, // Log full title for debugging
    finalTitle: finalTitle?.substring(0, 200),
    titleToInsert: titleToInsert?.substring(0, 200),
    titleToInsertFull: titleToInsert, // Log full title for debugging
    titleToInsertType: typeof titleToInsert,
    titleToInsertLength: titleToInsert?.length || 0,
    normalized,
    urlToStore: urlToStore?.substring(0, 100),
  });

  // ABSOLUTE FINAL SAFETY: If titleToInsert is still null, use clientTitle if available
  if (
    !titleToInsert &&
    clientTitle &&
    clientTitle.trim() &&
    clientTitle.trim() !== "X"
  ) {
    console.error(
      "Shelf API: [TITLE DEBUG] ABSOLUTE FINAL SAFETY - Setting titleToInsert from clientTitle",
    );
    titleToInsert = clientTitle.trim();
  }

  const insertData = {
    user_id: user.id,
    url: urlToStore,
    normalized_url: urlToStore,
    title: titleToInsert,
    description: metadata?.description ?? null,
    site_name: metadata?.siteName ?? null,
    image_url: imageUrlToStore,
    notes: notesToStore,
    content_text: metadata?.contentText ?? null,
  };

  console.log("Shelf API: [TITLE DEBUG] Insert data object", {
    ...insertData,
    title: insertData.title,
    titleType: typeof insertData.title,
    titleLength: insertData.title?.length || 0,
    titleValue: insertData.title, // Explicit title value
  });

  const insertRes = await supabase
    .from("bookmarks")
    .insert(insertData)
    .select("id,url,title,description,site_name,image_url,notes,created_at")
    .single();

  console.log("Shelf API: [TITLE DEBUG] Insert result", {
    error: insertRes.error,
    data: insertRes.data
      ? {
          id: insertRes.data.id,
          url: insertRes.data.url,
          title: insertRes.data.title,
          titleType: typeof insertRes.data.title,
        }
      : null,
  });

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
        { status: 400, headers: corsHeaders() },
      );
    }

    return NextResponse.json(
      { error: insertRes.error.message },
      { status: 400, headers: corsHeaders() },
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
        })),
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

  // ALWAYS include debug info - this is critical for debugging
  const debugInfo = {
    isX,
    titleToInsert,
    finalTitle,
    clientTitle: clientTitle?.substring(0, 200),
    normalized,
    hasClientTitle: !!clientTitle,
    clientTitleLength: clientTitle?.length || 0,
    titleToInsertLength: titleToInsert?.length || 0,
    finalTitleLength: finalTitle?.length || 0,
    metadataTitle: metadata?.title?.substring(0, 200),
    receivedClientTitle: json?.client_title?.substring(0, 200),
  };

  const responseData = {
    bookmark: { ...insertRes.data, tags },
    // ALWAYS include debug info in response for easier debugging
    _debug: debugInfo,
    _version: "api/bookmarks POST v2026-01-18-1",
  };

  console.log("=== Shelf API: [TITLE DEBUG] Returning response ===");
  console.log("Shelf API: bookmarkTitle:", insertRes.data.title);
  console.log("Shelf API: bookmarkTitleType:", typeof insertRes.data.title);
  console.log("Shelf API: titleToInsert that was sent:", titleToInsert);
  console.log("Shelf API: debugInfo:", JSON.stringify(debugInfo, null, 2));
  console.log("Shelf API: responseData keys:", Object.keys(responseData));
  console.log("Shelf API: responseData._debug exists:", !!responseData._debug);
  console.log(
    "Shelf API: Full responseData:",
    JSON.stringify(responseData, null, 2).substring(0, 2000),
  );
  console.log("=== End Shelf API response ===");

  const jsonResponse = NextResponse.json(responseData, {
    headers: corsHeaders(),
  });

  console.log(
    "Shelf API: [TITLE DEBUG] Response created, status:",
    jsonResponse.status,
  );

  return jsonResponse;
}
