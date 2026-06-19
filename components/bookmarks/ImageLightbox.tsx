"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Bookmark } from "@/types/bookmark";

const noop = () => () => {};

function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export function getBookmarkImageSrc(bookmark: Bookmark): string | null {
  const imageUrl = bookmark.image_url?.trim();
  if (imageUrl) return imageUrl;

  const url = bookmark.url?.trim();
  return url || null;
}

type ImageLightboxProps = {
  bookmarks: Bookmark[];
  selectedIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export function ImageLightbox({
  bookmarks,
  selectedIndex,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const isClient = useIsClient();

  const bookmark =
    selectedIndex !== null ? (bookmarks[selectedIndex] ?? null) : null;
  const imageSrc = bookmark ? getBookmarkImageSrc(bookmark) : null;
  const isOpen = Boolean(bookmark && imageSrc);

  const hasPrev = selectedIndex !== null && selectedIndex > 0;
  const hasNext =
    selectedIndex !== null && selectedIndex < bookmarks.length - 1;

  const handlePrev = useCallback(() => {
    if (selectedIndex !== null && hasPrev) {
      onNavigate(selectedIndex - 1);
    }
  }, [selectedIndex, hasPrev, onNavigate]);

  const handleNext = useCallback(() => {
    if (selectedIndex !== null && hasNext) {
      onNavigate(selectedIndex + 1);
    }
  }, [selectedIndex, hasNext, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isClient || !isOpen || !bookmark || !imageSrc) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={bookmark.title ?? "Image preview"}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-[0.97]"
        aria-label="Close"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>

      {hasPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-[0.97]"
          aria-label="Previous image"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}

      {hasNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-[0.97]"
          aria-label="Next image"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      )}

      <img
        src={imageSrc}
        alt={bookmark.title ?? "Saved image"}
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}
