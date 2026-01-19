"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { Bookmark } from "@/types/bookmark";
import { bookmarkViewModel } from "@/lib/bookmarks/viewModel";
import { stripMarkdown } from "@/lib/bookmarks/utils";
import { useNewTagTimer } from "@/hooks/useNewTagTimer";
import { BookmarkIcon } from "./BookmarkIcon";
import { BookmarkMainContent } from "./BookmarkMainContent";
import { RenameDialog } from "./RenameDialog";
import { NoteDialog } from "./NoteDialog";

type BookmarkItemProps = {
  bookmark: Bookmark;
  onDelete: (id: string) => void;
  onRename: (
    id: string,
    title: string
  ) => Promise<{ bookmark?: Bookmark; error?: string }>;
  isNew?: boolean;
  onRemoveNewTag: (id: string) => void;
  isFirst?: boolean;
};

export function BookmarkItem({
  bookmark,
  onDelete,
  onRename,
  isNew = false,
  onRemoveNewTag,
  isFirst = false,
}: BookmarkItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const itemRef = useRef<HTMLLIElement>(null);

  // Compute view model once per bookmark
  const vm = useMemo(() => bookmarkViewModel(bookmark), [bookmark]);

  // Simplified new tag timer
  const handleDismissNewTag = useCallback(() => {
    onRemoveNewTag(bookmark.id);
  }, [bookmark.id, onRemoveNewTag]);

  const [showNewTag] = useNewTagTimer(isNew, handleDismissNewTag);

  // Get initial rename value
  const initialRenameValue = useMemo(() => {
    return vm.isTextNote
      ? bookmark.title ?? stripMarkdown(bookmark.notes ?? "")
      : vm.primaryText;
  }, [vm.isTextNote, vm.primaryText, bookmark.title, bookmark.notes]);

  // Handle rename
  const handleRename = useCallback(
    async (title: string) => {
      const { error } = await onRename(bookmark.id, title);
      if (!error) {
        setRenameDialogOpen(false);
      }
      return { error };
    },
    [bookmark.id, onRename]
  );

  // Handle rename click
  const handleRenameClick = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setRenameDialogOpen(true);
  }, []);

  // Handle delete
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete(bookmark.id);
    },
    [bookmark.id, onDelete]
  );

  // Keyboard shortcut handling - works when item is focused (accessibility win)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Shift+R for rename
    if (e.shiftKey && e.key.toLowerCase() === "r") {
      e.preventDefault();
      e.stopPropagation();
      setRenameDialogOpen(true);
    }
  }, []);

  const actionButtons = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleRenameClick}
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition ring-1 ring-neutral-200 shadow-xs bg-white hover:bg-neutral-100/80 hover:text-neutral-800 active:scale-[0.97] ${
          isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="Rename bookmark"
        title="Rename bookmark"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={handleDelete}
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition ring-1 ring-neutral-200 shadow-xs bg-white hover:bg-neutral-100/80 hover:text-neutral-800 active:scale-[0.97] ${
          isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="Delete bookmark"
        title="Delete bookmark"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </button>
    </div>
  );

  // Text note bookmark
  if (vm.isTextNote) {
    return (
      <>
        <li
          ref={itemRef}
          className="hover:bg-neutral-100/50 rounded-xl"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="flex w-full items-center justify-between px-4">
            <NoteDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              notes={bookmark.notes}
              trigger={
                <button
                  type="button"
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-2.5 text-left text-neutral-800 focus:outline-none rounded-lg"
                >
                  <BookmarkIcon
                    bookmark={bookmark}
                    viewModel={vm}
                    showNewTag={showNewTag}
                  />
                  <BookmarkMainContent bookmark={bookmark} viewModel={vm} isFirst={isFirst} />
                </button>
              }
            />
            {actionButtons}
          </div>
        </li>
        <RenameDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          currentTitle={initialRenameValue}
          onRename={handleRename}
        />
      </>
    );
  }

  // Regular bookmark (link or image)
  return (
    <>
      <li
        ref={itemRef}
        className="hover:bg-neutral-100/50 rounded-xl"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="flex w-full items-center justify-between px-4">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-2.5 text-left text-neutral-800 hover:text-neutral-950 focus:outline-none rounded-lg"
          >
            <BookmarkIcon
              bookmark={bookmark}
              viewModel={vm}
              showNewTag={showNewTag}
            />
            <BookmarkMainContent bookmark={bookmark} viewModel={vm} />
          </a>
          {actionButtons}
        </div>
      </li>
      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        currentTitle={initialRenameValue}
        onRename={handleRename}
      />
    </>
  );
}
