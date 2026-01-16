import type { Bookmark } from "@/types/bookmark";
import { httpClient } from "@/lib/data/httpClient";

// DTO types for API responses
type BookmarksResponseDto = {
  bookmarks: Bookmark[];
};

type BookmarkResponseDto = {
  bookmark: Bookmark;
};

type SearchResponseDto = {
  results: Bookmark[];
};

// Map DTO to domain type
function mapBookmarkDto(dto: BookmarkResponseDto): Bookmark {
  return dto.bookmark;
}

function mapBookmarksDto(dto: BookmarksResponseDto): Bookmark[] {
  return dto.bookmarks ?? [];
}

function mapSearchResultsDto(dto: SearchResponseDto): Bookmark[] {
  return dto.results ?? [];
}

export async function fetchBookmarks(): Promise<Bookmark[]> {
  const response = await httpClient<BookmarksResponseDto>("/api/bookmarks", {
    method: "GET",
  });

  if (!response.success) {
    console.error("Failed to fetch bookmarks:", response.error);
    return [];
  }

  return mapBookmarksDto(response.data);
}

export async function createBookmark(
  url: string
): Promise<{ bookmark?: Bookmark; error?: string }> {
  const response = await httpClient<BookmarkResponseDto>("/api/bookmarks", {
    method: "POST",
    body: { url },
  });

  if (!response.success) {
    console.error("Failed to create bookmark:", response.error);
    return { error: response.error.message };
  }

  const bookmark = response.data.bookmark;
  if (!bookmark) {
    console.error("Invalid response: missing bookmark");
    return { error: "Invalid response from server" };
  }

  return { bookmark: mapBookmarkDto(response.data) };
}

export async function refreshBookmarkMetadata(
  id: string
): Promise<{ bookmark?: Bookmark; error?: string }> {
  const response = await httpClient<BookmarkResponseDto>(
    `/api/bookmarks/${id}/refresh`,
    {
      method: "POST",
    }
  );

  if (!response.success) {
    return { error: response.error.message };
  }

  const bookmark = response.data.bookmark;
  if (!bookmark) {
    return { error: "Invalid response from server" };
  }

  return { bookmark: mapBookmarkDto(response.data) };
}

export async function searchBookmarks(
  query: string,
  signal?: AbortSignal
): Promise<Bookmark[]> {
  const response = await httpClient<SearchResponseDto>(
    `/api/search?q=${encodeURIComponent(query)}`,
    {
      method: "GET",
      signal,
    }
  );

  if (!response.success) {
    return [];
  }

  return mapSearchResultsDto(response.data);
}

export async function deleteBookmark(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const response = await httpClient<unknown>(`/api/bookmarks/${id}`, {
    method: "DELETE",
  });

  if (!response.success) {
    return { success: false, error: response.error.message };
  }

  return { success: true };
}

export async function renameBookmark(
  id: string,
  title: string
): Promise<{ bookmark?: Bookmark; error?: string }> {
  const response = await httpClient<BookmarkResponseDto>(
    `/api/bookmarks/${id}`,
    {
      method: "PATCH",
      body: { title },
    }
  );

  if (!response.success) {
    return { error: response.error.message };
  }

  const bookmark = response.data.bookmark;
  if (!bookmark) {
    return { error: "Invalid response from server" };
  }

  return { bookmark: mapBookmarkDto(response.data) };
}

export async function logout(): Promise<{ success: boolean; error?: string }> {
  const response = await httpClient<unknown>("/api/logout", {
    method: "POST",
  });

  if (!response.success) {
    return { success: false, error: response.error.message };
  }

  return { success: true };
}
