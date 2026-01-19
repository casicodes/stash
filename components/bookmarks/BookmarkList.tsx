"use client";

import { useMemo } from "react";
import type { Bookmark } from "@/types/bookmark";
import { useExtensionInstalled } from "@/hooks/useExtensionInstalled";
import { categorizeBookmarksByTime } from "@/lib/bookmarks/timeCategories";
import { TimeSection } from "./TimeSection";

type BookmarkListProps = {
  bookmarks: Bookmark[];
  onDelete: (id: string) => void;
  onRename: (
    id: string,
    title: string
  ) => Promise<{ bookmark?: Bookmark; error?: string }>;
  newBookmarkIds: Set<string>;
  onRemoveNewTag: (id: string) => void;
  searchQuery?: string;
  isSearching?: boolean;
};

export function BookmarkList({
  bookmarks,
  onDelete,
  onRename,
  newBookmarkIds,
  onRemoveNewTag,
  searchQuery,
  isSearching = false,
}: BookmarkListProps) {
  const { isInstalled } = useExtensionInstalled();

  // Categorize bookmarks by time periods
  const timeCategories = useMemo(
    () => categorizeBookmarksByTime(bookmarks),
    [bookmarks]
  );

  // Show searching state with shimmer
  if (isSearching && searchQuery && searchQuery.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-neutral-500 text-shimmer">
          Searching...
        </p>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    // Show search-specific empty state if there's a search query
    if (searchQuery && searchQuery.trim()) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-neutral-500">
            {'No results found for "' + searchQuery.trim() + '"'}
          </p>
        </div>
      );
    }

    // Default empty state for no bookmarks
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="mb-2 font-medium text-neutral-800">No bookmarks yet</h3>
        <p className="mb-6 max-w-sm text-sm text-neutral-500">
          {isInstalled
            ? ""
            : "Paste a URL above to add your first bookmark, or install the browser extension to save pages with one click."}
        </p>
        {!isInstalled && (
          <a
            href="https://chrome.google.com/webstore/detail/shelf-save-bookmarks/gkccnmfilmkmpofmadleleeninlfblmd"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-6 py-2.5 text-neutral-700 shadow-sm transition-all hover:bg-neutral-100/80 active:scale-[0.97]"
          >
            Get browser extension
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {timeCategories.map((category, index) => (
        <TimeSection
          key={category.id}
          category={category}
          onDelete={onDelete}
          onRename={onRename}
          newBookmarkIds={newBookmarkIds}
          onRemoveNewTag={onRemoveNewTag}
          isFirst={index === 0}
        />
      ))}
    </div>
  );
}
