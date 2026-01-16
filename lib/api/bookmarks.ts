import type { Bookmark } from "@/types/bookmark";

export async function fetchBookmarks(): Promise<Bookmark[]> {
  try {
    const res = await fetch("/api/bookmarks", { method: "GET" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.bookmarks ?? [];
  } catch (error) {
    return [];
  }
}

export async function createBookmark(url: string): Promise<{ bookmark?: Bookmark; error?: string }> {
  try {
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    
    let json: any = {};
    let responseText: string | null = null;
    
    try {
      responseText = await res.text();
      json = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      responseText = responseText || "Unable to read response";
    }
    
    if (!res.ok) {
      const errorMsg = json?.error ?? "Failed to save";
      console.error("Shelf: Create bookmark error", {
        status: res.status,
        statusText: res.statusText,
        error: errorMsg,
        responseText: responseText || undefined,
        json: Object.keys(json).length > 0 ? json : undefined,
      });
      return { error: errorMsg };
    }
    
    if (!json.bookmark) {
      console.error("Shelf: No bookmark in response", {
        status: res.status,
        responseText: responseText || undefined,
        json: Object.keys(json).length > 0 ? json : undefined,
      });
      return { error: "Invalid response from server" };
    }
    
    return { bookmark: json.bookmark };
  } catch (error) {
    console.error("Shelf: Create bookmark network error", error);
    return { error: error instanceof Error ? error.message : "Network error" };
  }
}

export async function refreshBookmarkMetadata(id: string): Promise<{ bookmark?: Bookmark; error?: string }> {
  try {
    const res = await fetch(`/api/bookmarks/${id}/refresh`, {
      method: "POST",
    });
    const json = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      return { error: json?.error ?? "Failed to refresh" };
    }
    return { bookmark: json.bookmark };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Network error" };
  }
}

export async function searchBookmarks(
  query: string,
  signal?: AbortSignal
): Promise<Bookmark[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    signal,
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.results ?? [];
}

export async function deleteBookmark(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/bookmarks/${id}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, error: json?.error ?? "Failed to delete" };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Network error" };
  }
}

export async function renameBookmark(
  id: string,
  title: string
): Promise<{ bookmark?: Bookmark; error?: string }> {
  try {
    const res = await fetch(`/api/bookmarks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { error: json?.error ?? "Failed to rename" };
    }
    return { bookmark: json.bookmark };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Network error" };
  }
}

export async function logout(): Promise<void> {
  await fetch("/api/logout", { method: "POST" });
}
