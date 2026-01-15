"use client";

import type { Bookmark } from "@/types/bookmark";
import { BookmarkItem } from "./BookmarkItem";
import { useExtensionInstalled } from "@/hooks/useExtensionInstalled";

type BookmarkListProps = {
  bookmarks: Bookmark[];
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => Promise<{ bookmark?: Bookmark; error?: string }>;
};

export function BookmarkList({
  bookmarks,
  onDelete,
  onRename,
}: BookmarkListProps) {
  const { isInstalled } = useExtensionInstalled();

  // Debug: Show extension status
  console.log(
    "Extension detected:",
    isInstalled ? "Installed extension" : "No extension"
  );

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-6 rounded-full bg-neutral-100 p-4">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 7.8C5 6.11984 5 5.27976 5.32698 4.63803C5.6146 4.07354 6.07354 3.6146 6.63803 3.32698C7.27976 3 8.11984 3 9.8 3H14.2C15.8802 3 16.7202 3 17.362 3.32698C17.9265 3.6146 18.3854 4.07354 18.673 4.63803C19 5.27976 19 6.11984 19 7.8V21L12 17L5 21V7.8Z"
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3 className="mb-2 font-medium text-neutral-800">No bookmarks yet</h3>
        <p className="mb-6 max-w-sm text-sm text-neutral-500">
          {isInstalled
            ? "Paste a URL above to add your first bookmark."
            : "Paste a URL above to add your first bookmark, or install the browser extension to save pages with one click."}
        </p>
        {!isInstalled && (
          <a
            href="https://github.com/yourusername/shelf/releases"
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
    <ul className="divide-y divide-neutral-100/50">
      {bookmarks.map((bookmark) => (
        <BookmarkItem
          key={bookmark.id}
          bookmark={bookmark}
          onDelete={onDelete}
          onRename={onRename}
        />
      ))}
    </ul>
  );
}
