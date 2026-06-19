"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Bookmark } from "@/types/bookmark";
import { useNewTagTimer } from "@/hooks/useNewTagTimer";
import { NewBadge } from "./NewBadge";
import { getBookmarkImageSrc } from "@/lib/bookmarks/utils";

type ImageMasonryGridProps = {
  bookmarks: Bookmark[];
  onDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void | Promise<void>;
  onCancelDelete: () => void;
  pendingDeleteId: string | null;
  newBookmarkIds: Set<string>;
  onRemoveNewTag: (id: string) => void;
  onOpenImageLightbox: (id: string) => void;
};

function getImageSrc(bookmark: Bookmark): string {
  return getBookmarkImageSrc(bookmark) ?? "";
}

function getImageSourceUrl(bookmark: Bookmark): string {
  return bookmark.notes && bookmark.notes.startsWith("http")
    ? bookmark.notes
    : bookmark.url;
}

type ImageMasonryItemProps = {
  bookmark: Bookmark;
  onDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void | Promise<void>;
  onCancelDelete: () => void;
  isConfirmingDelete: boolean;
  isNew: boolean;
  onRemoveNewTag: (id: string) => void;
  onOpenImageLightbox: (id: string) => void;
};

function ImageMasonryItem({
  bookmark,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  isConfirmingDelete,
  isNew,
  onRemoveNewTag,
  onOpenImageLightbox,
}: ImageMasonryItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleDismissNewTag = useCallback(() => {
    onRemoveNewTag(bookmark.id);
  }, [bookmark.id, onRemoveNewTag]);

  const [showNewTag] = useNewTagTimer(isNew, handleDismissNewTag);

  const imageSrc = getImageSrc(bookmark);
  const sourceUrl = getImageSourceUrl(bookmark);

  return (
    <div
      className={`relative mb-4 break-inside-avoid overflow-hidden rounded-lg ring-1 ring-neutral-100 ${isConfirmingDelete ? "cursor-default" : "cursor-zoom-in"}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!isConfirmingDelete) {
          onOpenImageLightbox(bookmark.id);
        }
      }}
      onKeyDown={(e) => {
        if (isConfirmingDelete) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenImageLightbox(bookmark.id);
        }
      }}
      role="button"
      tabIndex={0}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NewBadge show={showNewTag} variant="pill" />

      <img
        src={imageSrc}
        alt={bookmark.title ?? "Saved image"}
        className="w-full rounded-lg"
        loading="lazy"
      />

      <AnimatePresence>
        {isConfirmingDelete ? (
          <motion.div
            key="confirm-delete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-red-50/95 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center text-sm text-red-600">Delete this image?</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onConfirmDelete(bookmark.id)}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-sm text-white transition hover:bg-red-600 active:scale-[0.97]"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={onCancelDelete}
                className="rounded-lg bg-white px-3 py-1.5 text-sm text-neutral-800 shadow-xs ring-1 ring-neutral-200 transition hover:bg-neutral-100/80 active:scale-[0.97]"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : isHovered ? (
          <motion.div
            key="hover-actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute inset-0 flex items-end justify-end gap-2 rounded-lg bg-black/20 p-2"
          >
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-lg bg-white text-neutral-500 shadow-xs ring-1 ring-neutral-200 transition hover:bg-neutral-100/80 hover:text-neutral-800 active:scale-[0.97]"
              aria-label="Open source"
              title="Open source"
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
                <path d="M15 3h6v6" />
                <path d="M10 14 21 3" />
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </svg>
            </a>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(bookmark.id);
              }}
              className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-lg bg-white text-neutral-500 shadow-xs ring-1 ring-neutral-200 transition hover:bg-neutral-100/80 hover:text-neutral-800 active:scale-[0.97]"
              aria-label="Delete image"
              title="Delete image"
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
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function ImageMasonryGrid({
  bookmarks,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  pendingDeleteId,
  newBookmarkIds,
  onRemoveNewTag,
  onOpenImageLightbox,
}: ImageMasonryGridProps) {
  const sortedBookmarks = useMemo(
    () =>
      [...bookmarks].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [bookmarks]
  );

  return (
    <div className="columns-3 gap-4 px-4 pt-2">
      {sortedBookmarks.map((bookmark) => (
        <ImageMasonryItem
          key={bookmark.id}
          bookmark={bookmark}
          onDelete={onDelete}
          onConfirmDelete={onConfirmDelete}
          onCancelDelete={onCancelDelete}
          isConfirmingDelete={pendingDeleteId === bookmark.id}
          isNew={newBookmarkIds.has(bookmark.id)}
          onRemoveNewTag={onRemoveNewTag}
          onOpenImageLightbox={onOpenImageLightbox}
        />
      ))}
    </div>
  );
}
