"use client";

import { useCallback } from "react";
import type { Bookmark } from "@/types/bookmark";
import { normalizeUrl } from "@/lib/url/normalize";

export function useBookmarkValidation(bookmarks: Bookmark[]) {
  const checkDuplicateUrl = useCallback(
    (url: string): boolean => {
      const normalized = normalizeUrl(url);
      if (!normalized) return false;

      return bookmarks.some((bookmark) => {
        const bookmarkNormalized = normalizeUrl(bookmark.url);
        return bookmarkNormalized === normalized;
      });
    },
    [bookmarks]
  );

  return {
    checkDuplicateUrl,
  };
}
