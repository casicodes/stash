"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  onConfirmDelete?: (id: string) => void | Promise<void>;
  onCancelDelete?: () => void;
  isConfirmingDelete?: boolean;
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
  onConfirmDelete,
  onCancelDelete,
  isConfirmingDelete = false,
  onRename,
  isNew = false,
  onRemoveNewTag,
  isFirst = false,
}: BookmarkItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [justExitedConfirm, setJustExitedConfirm] = useState(false);
  const itemRef = useRef<HTMLLIElement>(null);

  // Compute view model once per bookmark
  const vm = useMemo(() => bookmarkViewModel(bookmark), [bookmark]);

  // Simplified new tag timer
  const handleDismissNewTag = useCallback(() => {
    onRemoveNewTag(bookmark.id);
  }, [bookmark.id, onRemoveNewTag]);

  const [showNewTag] = useNewTagTimer(isNew, handleDismissNewTag);

  // Track when we exit confirm state to hide buttons briefly
  useEffect(() => {
    if (!isConfirmingDelete && justExitedConfirm) {
      const timeoutId = setTimeout(() => {
        setJustExitedConfirm(false);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [isConfirmingDelete, justExitedConfirm]);

  // Auto-cancel delete confirmation after 12 seconds
  useEffect(() => {
    if (isConfirmingDelete && onCancelDelete) {
      const timeoutId = setTimeout(() => {
        setJustExitedConfirm(true);
        onCancelDelete();
      }, 12000);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [isConfirmingDelete, onCancelDelete]);

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

  const handleConfirmDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onConfirmDelete?.(bookmark.id);
    },
    [bookmark.id, onConfirmDelete]
  );

  const handleCancelDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setJustExitedConfirm(true);
      onCancelDelete?.();
    },
    [onCancelDelete]
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

  const confirmDeleteButtons = (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={handleConfirmDelete}
        className="rounded-lg px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 active:scale-[0.97] transition"
        aria-label="Delete bookmark"
      >
        Delete
      </button>
      <button
        type="button"
        onClick={handleCancelDelete}
        className="rounded-lg px-3 py-1.5 text-sm text-neutral-800 ring-1 ring-neutral-200 shadow-xs bg-white hover:bg-neutral-100/80 active:scale-[0.97] transition"
        aria-label="Cancel"
      >
        Cancel
      </button>
    </div>
  );

  const actionButtons = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleRenameClick}
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition ring-1 ring-neutral-200 shadow-xs bg-white hover:bg-neutral-100/80 hover:text-neutral-800 active:scale-[0.97] ${isHovered && !justExitedConfirm ? "opacity-100" : "opacity-0 pointer-events-none"
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
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition ring-1 ring-neutral-200 shadow-xs bg-white hover:bg-neutral-100/80 hover:text-neutral-800 active:scale-[0.97] ${isHovered && !justExitedConfirm ? "opacity-100" : "opacity-0 pointer-events-none"
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

  const rowClassName = `rounded-xl relative overflow-hidden ${!isConfirmingDelete ? "hover:bg-neutral-100/50" : ""
    }`;

  const confirmContent = (
    <div className="flex min-w-0 flex-1 items-center gap-3 py-2.5">
      <BookmarkIcon
        bookmark={bookmark}
        viewModel={vm}
        showNewTag={showNewTag}
      />
      <div className="min-w-0 flex-1 flex flex-col min-h-[2.5rem] justify-center">
        <p className="truncate leading-5 text-red-600">
          Delete this bookmark?
        </p>
        {vm.secondaryText && (
          <p className="truncate text-neutral-400 text-sm">{vm.secondaryText}</p>
        )}
      </div>
    </div>
  );

  // Text note bookmark
  if (vm.isTextNote) {
    return (
      <>
        <li
          ref={itemRef}
          className={rowClassName}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <AnimatePresence>
            {isConfirmingDelete && (
              <motion.div
                key="confirm-bg"
                className="absolute inset-0 bg-red-50/90 rounded-xl -z-10"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  type: "spring",
                  visualDuration: 0.15,
                  bounce: 0.3
                }}
              />
            )}
          </AnimatePresence>
          <div className="flex w-full items-center justify-between px-4">
            {isConfirmingDelete ? (
              confirmContent
            ) : (
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
            )}
            {isConfirmingDelete
              ? confirmDeleteButtons
              : justExitedConfirm
                ? null
                : actionButtons}
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
        className={rowClassName}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <AnimatePresence>
          {isConfirmingDelete && (
            <motion.div
              key="confirm-bg"
              className="absolute inset-0 bg-red-50/90 rounded-xl -z-10"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                type: "spring",
                visualDuration: 0.15,
                bounce: 0.3
              }}
            />
          )}
        </AnimatePresence>
        <div className="flex w-full items-center justify-between px-4">
          {isConfirmingDelete ? (
            confirmContent
          ) : (
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
          )}
          {isConfirmingDelete
            ? confirmDeleteButtons
            : justExitedConfirm
              ? null
              : actionButtons}
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
