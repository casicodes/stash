"use client";

import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";

import type { Bookmark, FilterTag } from "@/types/bookmark";
import { FILTER_TAGS } from "@/types/bookmark";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useSearch } from "@/hooks/useSearch";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useExtensionInstalled } from "@/hooks/useExtensionInstalled";
import { useAuth } from "@/hooks/useAuth";
import { useBookmarkValidation } from "@/hooks/useBookmarkValidation";
import {
  BookmarkInput,
  BookmarkList,
  FilterTags,
  AddUrlDialog,
} from "./bookmarks";

type BookmarksClientProps = {
  initial: Bookmark[];
};

export default function BookmarksClient({ initial }: BookmarksClientProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const deleteAudioRef = useRef<HTMLAudioElement | null>(null);

  const [activeFilter, setActiveFilter] = useState<FilterTag>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Hooks
  const {
    items,
    addBookmark,
    refreshMetadata,
    deleteBookmark,
    undoDelete,
    confirmDelete,
    renameBookmark,
    newBookmarkIds,
    removeNewTag,
  } = useBookmarks(initial);

  const { logout, isLoggingOut, userEmail } = useAuth();
  const { checkDuplicateUrl } = useBookmarkValidation(items);

  // Preload audio files
  useEffect(() => {
    deleteAudioRef.current = new Audio("/audio/button.wav");
    deleteAudioRef.current.preload = "auto";
    deleteAudioRef.current.load();
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      if (deleteAudioRef.current) {
        deleteAudioRef.current.currentTime = 0;
        deleteAudioRef.current.play().catch(() => {
          // Ignore errors if audio fails to play
        });
      }

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
          onDismiss: async () => {
            const { error } = await confirmDelete(id);
            if (error) {
              toast.error(`Failed to delete: ${error}`);
            }
          },
          onAutoClose: async () => {
            const { error } = await confirmDelete(id);
            if (error) {
              toast.error(`Failed to delete: ${error}`);
            }
          },
        });
      }
    },
    [deleteBookmark, undoDelete, confirmDelete]
  );
  const { query, setQuery, results: searchResults, isLoading: isSearching, clearSearch } = useSearch();
  const { isInstalled } = useExtensionInstalled();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onAddMode: useCallback(() => {
      setAddDialogOpen(true);
    }, []),
  });

  // Compute available tags from bookmarks
  const uniqueTags = useMemo(() => {
    return new Set(items.flatMap((b) => b.tags ?? []));
  }, [items]);

  const availableTags = useMemo(() => {
    const allTag = FILTER_TAGS.find((tag) => tag.id === "all")!;
    const otherTags = FILTER_TAGS.filter(
      (tag) => tag.id !== "all" && uniqueTags.has(tag.id)
    ) as Array<{ id: FilterTag; label: string }>;
    return [allTag, ...otherTags];
  }, [uniqueTags]);

  // Only show filters if: more than 5 bookmarks AND 2+ unique tags
  const shouldShowFilters = items.length > 5 && uniqueTags.size > 1;

  // Apply filter to search results or all items
  const displayed = useMemo(() => {
    // Use search results if they exist (even if empty), otherwise use all items
    const source = searchResults !== null ? searchResults : items;

    if (activeFilter === "all") {
      return source;
    }

    return source.filter((b) => b.tags?.includes(activeFilter));
  }, [searchResults, items, activeFilter]);


  // Handle add bookmark
  const handleAddBookmark = useCallback(
    async (url: string) => {
      const { error } = await addBookmark(url);

      if (error) {
        if (error === "DUPLICATE_BOOKMARK") {
          toast.success("Already saved", {
            icon: (
              <svg className="h-5 w-5" fill="#008236" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="#008236" />
                <path
                  d="M9 12l2 2 4-4"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            ),
          });
        }
        return { error };
      }

      return {};
    },
    [addBookmark]
  );

  const handleSignOut = useCallback(() => {
    logout();
  }, [logout]);

  return (
    <div className="mx-auto flex h-screen w-full max-w-3xl flex-col px-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white px-4">
        <div className="flex items-center gap-12 py-4 ">
          <div className="flex items-center gap-2">
            <img src="/icon48.png" alt="Shelf" className="h-6 w-6" />
            <div className="font-medium text-neutral-700">Shelf</div>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <BookmarkInput
              ref={inputRef}
              searchValue={query}
              onSearchChange={setQuery}
              onClearSearch={clearSearch}
              isLoading={isSearching}
            />
            <button
              type="button"
              onClick={() => setAddDialogOpen(true)}
              className="flex h-[32px] w-[35px] items-center justify-center rounded-md text-neutral-500 transition ring-1 ring-neutral-200 shadow-sm bg-white hover:bg-neutral-100/80 hover:text-neutral-800 active:scale-[0.97] box-border"
              title="Add URL"
              style={{ boxSizing: "border-box" }}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M12 5v14m-7-7h14" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button
              className="w-[55px] text-neutral-500 hover:text-neutral-900 underline underline-offset-2 transition active:scale-[0.97] disabled:opacity-50"
              type="button"
              onClick={handleSignOut}
              disabled={isLoggingOut}
              title={userEmail || undefined}
            >
              {isLoggingOut ? (
                <span className="inline-flex items-center">
                  <span className="h-4 w-4 border-2 border-[#e0e0e0] border-t-[#888] rounded-full animate-spin" />
                </span>
              ) : (
                "Log out"
              )}
            </button>
          </div>
        </div>

        {items.length > 0 && (
          <div className="min-h-[2rem] flex items-center gap-4 border-t border-b border-dashed border-neutral-100 py-4">
            {shouldShowFilters ? (
              <FilterTags
                availableTags={availableTags}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />
            ) : (
              <div className="text-sm text-neutral-500">My bookmarks</div>
            )}
          </div>
        )}
      </div>

      {/* Bookmark list */}
      <div className="scrollbar-light flex-1 overflow-y-auto pb-8">
        <BookmarkList
          bookmarks={displayed}
          onDelete={handleDelete}
          onRename={renameBookmark}
          newBookmarkIds={newBookmarkIds}
          onRemoveNewTag={removeNewTag}
          searchQuery={query}
          isSearching={isSearching}
        />
      </div>

      {/* Add URL Dialog */}
      <AddUrlDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddBookmark}
        checkDuplicateUrl={checkDuplicateUrl}
      />
    </div>
  );
}
