"use client";

import { useState } from "react";
import type { Bookmark } from "@/types/bookmark";
import type { TimeCategory } from "@/lib/bookmarks/timeCategories";
import { BookmarkItem } from "./BookmarkItem";

type TimeSectionProps = {
  category: TimeCategory;
  onDelete: (id: string) => void;
  onRename: (
    id: string,
    title: string
  ) => Promise<{ bookmark?: Bookmark; error?: string }>;
  newBookmarkIds: Set<string>;
  onRemoveNewTag: (id: string) => void;
  isFirst: boolean;
};

export function TimeSection({
  category,
  onDelete,
  onRename,
  newBookmarkIds,
  onRemoveNewTag,
  isFirst,
}: TimeSectionProps) {
  const [isExpanded, setIsExpanded] = useState(category.defaultExpanded);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="sticky top-0 z-30 w-full flex items-center gap-2 py-3 px-4 text-left transition-colors group bg-white hover:bg-[#fafafa] rounded-lg"
      >
        <span className="text-sm font-medium text-neutral-800">
          {category.label}
        </span>
        <svg
          className={`h-4 w-4 text-neutral-500 transition-transform duration-200 ${
            isExpanded ? "rotate-0" : "-rotate-90"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isExpanded && (
        <ul className="divide-y divide-neutral-100/50">
          {category.bookmarks.map((bookmark, index) => (
            <BookmarkItem
              key={bookmark.id}
              bookmark={bookmark}
              onDelete={onDelete}
              onRename={onRename}
              isNew={newBookmarkIds.has(bookmark.id)}
              onRemoveNewTag={onRemoveNewTag}
              isFirst={isFirst && index === 0}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
