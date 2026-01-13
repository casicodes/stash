"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { Bookmark, InputMode, FilterTag } from "@/types/bookmark";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useSearch } from "@/hooks/useSearch";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { logout } from "@/lib/api/bookmarks";

import { BookmarkInput, BookmarkList, FilterTags } from "./bookmarks";

type BookmarksClientProps = {
  initial: Bookmark[];
};

export default function BookmarksClient({ initial }: BookmarksClientProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // State
  const [mode, setMode] = useState<InputMode>("add");
  const [addInput, setAddInput] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTag | null>(null);

  // Hooks
  const {
    items,
    refreshingId,
    addBookmark,
    refreshMetadata,
    deleteBookmark,
    undoDelete,
    confirmDelete,
  } = useBookmarks(initial);

  const handleDelete = useCallback(
    (id: string) => {
      const { deletedBookmark } = deleteBookmark(id);

      if (deletedBookmark) {
        const title = deletedBookmark.title || deletedBookmark.url;
        const displayTitle =
          title.length > 40 ? title.slice(0, 40) + "..." : title;

        toast(`Deleted "${displayTitle}"`, {
          action: {
            label: "Undo",
            onClick: () => undoDelete(id),
          },
          onDismiss: () => confirmDelete(id),
          onAutoClose: () => confirmDelete(id),
        });
      }
    },
    [deleteBookmark, undoDelete, confirmDelete]
  );
  const { query, setQuery, results: searchResults, clearSearch } = useSearch();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onAddMode: useCallback(() => {
      setMode("add");
      setActiveFilter(null);
    }, []),
    onSearchMode: useCallback(() => {
      setMode("search");
    }, []),
    onEscape: useCallback(() => {
      setMode("add");
      clearSearch();
      setActiveFilter(null);
    }, [clearSearch]),
    inputRef,
  });

  // Filter bookmarks by active tag
  const filteredItems = activeFilter
    ? items.filter((b) => b.tags?.includes(activeFilter))
    : null;

  // Display priority: search results > filtered items > all items
  const displayed = searchResults ?? filteredItems ?? items;

  // Handlers
  const handleSubmit = async () => {
    const url = addInput.trim();
    if (!url) return;

    setAddInput("");
    const { error } = await addBookmark(url);

    if (error) {
      alert(error);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.push("/auth/sign-in");
  };

  return (
    <div className="mx-auto flex h-screen w-full max-w-4xl flex-col px-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white pb-4">
        <div className="flex items-center justify-between py-8">
          <div className="flex items-center gap-2">
            <img src="/icon48.png" alt="Stash" className="h-6 w-6" />
            <div className="font-medium text-neutral-700">
              Stash - All your bookmarks in one place
            </div>
          </div>
          <button
            className="text-neutral-600 hover:text-neutral-900"
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>

        <BookmarkInput
          ref={inputRef}
          mode={mode}
          addValue={addInput}
          searchValue={query}
          onAddChange={setAddInput}
          onSearchChange={setQuery}
          onSubmit={handleSubmit}
        />

        {mode === "search" && (
          <FilterTags
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        )}

        <div className="mt-8">
          <div className="text-xs font-medium tracking-wide text-neutral-500">
            TITLE
          </div>
        </div>
      </div>

      {/* Bookmark list */}
      <div className="scrollbar-light flex-1 overflow-y-auto pb-8">
        <BookmarkList
          bookmarks={displayed}
          refreshingId={refreshingId}
          onRefresh={refreshMetadata}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
