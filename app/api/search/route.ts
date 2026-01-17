import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateQueryEmbedding } from "@/lib/embeddings/query-cache";
import { urlDomain, normalizeUrl } from "@/lib/url/normalize";

const SearchSchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parsed = SearchSchema.safeParse({
    q: searchParams.get("q"),
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  const limit = parsed.data.limit ?? 50;
  const q = parsed.data.q.trim();

  // Helper function to fetch tags for bookmarks
  const fetchTagsForBookmarks = async (bookmarkIds: string[]) => {
    if (bookmarkIds.length === 0) return new Map<string, string[]>();
    
    const { data: tagsData } = await supabase
      .from("bookmark_tags")
      .select("bookmark_id, tag")
      .in("bookmark_id", bookmarkIds)
      .eq("user_id", user.id);

    const tagsMap = new Map<string, string[]>();
    (tagsData ?? []).forEach(({ bookmark_id, tag }) => {
      if (!tagsMap.has(bookmark_id)) {
        tagsMap.set(bookmark_id, []);
      }
      tagsMap.get(bookmark_id)!.push(tag);
    });
    return tagsMap;
  };

  let embResult: Awaited<ReturnType<typeof getOrCreateQueryEmbedding>> | null = null;
  try {
    // Always do hybrid search: semantic + keyword with weighted scoring
    // Use cached embedding if available
    embResult = await getOrCreateQueryEmbedding(q);
    const { data, error } = await supabase.rpc("match_bookmarks_hybrid", {
      p_user_id: user.id,
      p_query_embedding: `[${embResult.embedding.join(",")}]`,
      p_query_text: q,
      p_match_count: limit,
    });

    if (error) {
      // Fallback to keyword-only search if hybrid fails
      const maybeUrl = normalizeUrl(q);
      const domain = urlDomain(maybeUrl);

      const query = supabase
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
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (domain) {
        query.ilike("url", `%${domain}%`);
      } else {
        query.or(
          `title.ilike.%${q}%,notes.ilike.%${q}%,content_text.ilike.%${q}%,description.ilike.%${q}%,url.ilike.%${q}%`
        );
      }

      const { data: fallbackData, error: fallbackError } = await query;
      if (fallbackError)
        return NextResponse.json(
          { error: fallbackError.message },
          { status: 500 }
        );
      
      // Transform bookmark_tags to flat tags array
      const results = (fallbackData ?? []).map((b: any) => ({
        id: b.id,
        url: b.url,
        title: b.title,
        description: b.description,
        site_name: b.site_name,
        image_url: b.image_url,
        notes: b.notes,
        created_at: b.created_at,
        tags: b.bookmark_tags?.map((t: any) => t.tag) ?? [],
      }));
      
      return NextResponse.json({ 
        results, 
        fallback: true,
        _cache: embResult ? {
          hit: embResult.cacheHit,
          embedTime: embResult.embedTime,
          error: embResult.cacheError,
        } : {
          hit: false,
          embedTime: undefined,
          error: "Unknown error",
        }
      });
    }

    // For RPC results, fetch tags separately
    if (data && data.length > 0) {
      const bookmarkIds = data.map((b: any) => b.bookmark_id);
      const tagsMap = await fetchTagsForBookmarks(bookmarkIds);
      
      const results = data.map((b: any) => ({
        id: b.bookmark_id,
        url: b.url,
        title: b.title,
        description: b.description,
        site_name: b.site_name,
        image_url: b.image_url,
        notes: b.notes,
        created_at: b.created_at,
        tags: tagsMap.get(b.bookmark_id) ?? [],
      }));
      
      return NextResponse.json({ 
        results,
        _cache: {
          hit: embResult.cacheHit,
          embedTime: embResult.embedTime,
          error: embResult.cacheError,
        }
      });
    }

    return NextResponse.json({ 
      results: [],
      _cache: embResult ? {
        hit: embResult.cacheHit,
        embedTime: embResult.embedTime,
        error: embResult.cacheError,
      } : {
        hit: false,
        embedTime: undefined,
        error: "Unknown error",
      }
    });
  } catch (err) {
    // Fallback keyword search if embedding generation fails
    const maybeUrl = normalizeUrl(q);
    const domain = urlDomain(maybeUrl);

    const query = supabase
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
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (domain) {
      query.ilike("url", `%${domain}%`);
    } else {
      query.or(
        `title.ilike.%${q}%,notes.ilike.%${q}%,content_text.ilike.%${q}%,description.ilike.%${q}%,url.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    
    // Transform bookmark_tags to flat tags array
    const results = (data ?? []).map((b: any) => ({
      id: b.id,
      url: b.url,
      title: b.title,
      description: b.description,
      site_name: b.site_name,
      image_url: b.image_url,
      notes: b.notes,
      created_at: b.created_at,
      tags: b.bookmark_tags?.map((t: any) => t.tag) ?? [],
    }));
    
    return NextResponse.json({ 
      results, 
      fallback: true,
      _cache: embResult ? {
        hit: embResult.cacheHit,
        embedTime: embResult.embedTime,
        error: embResult.cacheError,
      } : {
        hit: false,
        embedTime: undefined,
        error: "Embedding generation failed",
      }
    });
  }
}
