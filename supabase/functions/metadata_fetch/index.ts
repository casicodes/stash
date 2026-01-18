import { createAdminClient } from "../_shared/supabaseAdmin.ts";
import { extractMetadata } from "../_shared/metadata.ts";

type Payload = {
  bookmarkId: string;
  userId: string;
};

function json(resBody: unknown, status = 200) {
  return new Response(JSON.stringify(resBody), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

async function fetchHtml(url: string) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 8000);

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        "Accept": "text/html",
      }
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return null;
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

export default Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createAdminClient();
  const payload = (await req.json().catch(() => null)) as Payload | null;
  if (!payload?.bookmarkId || !payload?.userId) return json({ error: "Invalid payload" }, 400);

  const { data: bookmark, error: bookmarkErr } = await supabase
    .from("bookmarks")
    .select("id,user_id,url,title")
    .eq("id", payload.bookmarkId)
    .single();

  if (bookmarkErr || !bookmark) return json({ error: "Bookmark not found" }, 404);
  if (bookmark.user_id !== payload.userId) return json({ error: "Forbidden" }, 403);

  // Check if this is an X bookmark - preserve existing title if it exists
  function isXBookmark(url: string): boolean {
    try {
      const h = new URL(url).hostname.toLowerCase();
      return h === "x.com" || h === "twitter.com" || h.endsWith(".x.com") || h.endsWith(".twitter.com");
    } catch {
      return false;
    }
  }

  const isX = isXBookmark(bookmark.url);
  const existingTitle = bookmark.title;

  const html = await fetchHtml(bookmark.url);
  if (!html) {
    return json({ ok: true, skipped: true });
  }

  const meta = extractMetadata(html, bookmark.url);
  
  if (!meta.title && !meta.imageUrl) {
    console.warn("OG scrape failed for", bookmark.url);
  }

  // For X bookmarks, try to extract title from HTML (similar to fetchXTitle)
  let titleToUpdate: string | null = null;
  if (isX) {
    // Extract title from HTML for X bookmarks (better than OG tags)
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      const extractedTitle = titleMatch[1]
        .replace(/\s+/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .trim();
      
      // Only use if it's valid (not "X", "login", etc.)
      if (extractedTitle && 
          extractedTitle.toLowerCase() !== "x" &&
          extractedTitle.toLowerCase() !== "twitter" &&
          !extractedTitle.toLowerCase().includes("login") &&
          extractedTitle.length >= 3) {
        titleToUpdate = extractedTitle;
      }
    }
    
    // If we didn't get a good title from HTML, check if we should preserve existing
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
      } else if (meta.title) {
        titleToUpdate = meta.title;
      }
    }
  } else {
    // For non-X bookmarks, use metadata title
    titleToUpdate = meta.title;
  }

  const updateRes = await supabase
    .from("bookmarks")
    .update({
      title: titleToUpdate,
      description: meta.description,
      site_name: meta.siteName,
      image_url: meta.imageUrl
    })
    .eq("id", payload.bookmarkId);

  if (updateRes.error) return json({ error: updateRes.error.message }, 500);

  // Then embed the updated content
  const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/embedding_upsert`;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRoleKey) {
    fetch(fnUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }

  return json({ ok: true });
});

