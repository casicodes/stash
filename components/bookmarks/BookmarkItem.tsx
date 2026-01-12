"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import type { Bookmark } from "@/types/bookmark";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type BookmarkItemProps = {
  bookmark: Bookmark;
  isRefreshing: boolean;
  onRefresh: (id: string) => void;
  onDelete: (id: string) => void;
};

function getFaviconUrl(url: string): string | null {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s*/gm, "") // Remove heading markers (with or without space)
    .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold
    .replace(/\*(.+?)\*/g, "$1") // Remove italic
    .replace(/~~(.+?)~~/g, "$1") // Remove strikethrough
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // Remove code blocks and inline code
    .replace(/^\s*[-*+]\s+/gm, "") // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, "") // Remove numbered list markers
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // Remove links, keep text
    .replace(/^>\s*/gm, "") // Remove blockquote markers
    .replace(/\n+/g, " ") // Replace newlines with spaces for single line display
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}

export function BookmarkItem({
  bookmark,
  isRefreshing,
  onRefresh,
  onDelete,
}: BookmarkItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const isTextNote = bookmark.url.startsWith("note://");
  const isLoading = bookmark.id.startsWith("temp-");
  const faviconUrl = isTextNote ? null : getFaviconUrl(bookmark.url);

  const displayText = isTextNote
    ? stripMarkdown(bookmark.notes ?? bookmark.title ?? "Note")
    : bookmark.title ?? bookmark.url;

  const showRefresh = !isTextNote && !bookmark.title && !isLoading;

  const icon = isTextNote ? (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs text-neutral-500">
      ✎
    </div>
  ) : isLoading ? (
    <div className="h-5 w-5 shrink-0 animate-pulse rounded-full bg-neutral-200" />
  ) : faviconUrl ? (
    <img
      src={faviconUrl}
      alt=""
      width={20}
      height={20}
      className="h-5 w-5 shrink-0 rounded-full"
    />
  ) : (
    <div className="h-5 w-5 shrink-0 rounded-full bg-neutral-200" />
  );

  const content = (
    <>
      <div className="flex min-w-0 flex-1 items-start gap-3 pr-8">
        {icon}
        <div className="min-w-0 flex-1">
          <p className={`truncate leading-5 ${isLoading ? "shimmer" : ""}`}>
            {displayText}
          </p>
          {!isTextNote && bookmark.title && (
            <p className="truncate text-neutral-400">{bookmark.url}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {showRefresh && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRefresh(bookmark.id);
            }}
            disabled={isRefreshing}
            className="rounded px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-50"
          >
            {isRefreshing ? "..." : "↻"}
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(bookmark.id);
          }}
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-500 active:scale-[0.97] ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
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
    </>
  );

  const noteDialogContent = (
    <AlertDialogContent
      className="max-h-[85vh] overflow-y-auto"
      onOverlayClick={() => setDialogOpen(false)}
    >
      <AlertDialogHeader>
        <AlertDialogTitle className="sr-only">Details</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="text-left">
            <div className="prose prose-neutral prose-sm max-w-none [&_p]:my-4 [&_h1]:mb-2 [&_h2]:mb-2 [&_h3]:mb-2 [&_hb]:mb-2 [&_h5]:mb-2 [&_h6]:mb-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_blockquote]:my-2">
              <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                {bookmark.notes ?? ""}
              </ReactMarkdown>
            </div>
            <p className="text-xs text-neutral-400">
              Saved on {formatDate(bookmark.created_at)}
            </p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
    </AlertDialogContent>
  );

  if (isTextNote) {
    return (
      <li
        className="hover:bg-neutral-100/50 rounded-xl"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between px-2 py-4 text-left text-neutral-800"
            >
              {content}
            </button>
          </AlertDialogTrigger>
          {noteDialogContent}
        </AlertDialog>
      </li>
    );
  }

  return (
    <li
      className="hover:bg-neutral-100/50 rounded-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <a
        href={bookmark.url}
        target="_blank"
        rel="noreferrer"
        className={`flex w-full cursor-pointer items-center justify-between px-2 py-4 text-left text-neutral-800 hover:text-neutral-950 ${
          isLoading ? "text-base" : "text-sm"
        }`}
      >
        {content}
      </a>
    </li>
  );
}
