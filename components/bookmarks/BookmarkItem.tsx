"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import type { Bookmark } from "@/types/bookmark";
import { getFaviconUrl, stripMarkdown } from "@/lib/bookmarks/utils";
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
  onDelete: (id: string) => void;
};

const markdownProseClassName =
  "prose prose-neutral prose-sm max-w-none [&_p]:my-4 [&_p]:text-[15px] [&_p]:leading-6 [&_p]:text-neutral-800 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:mb-2 [&_h3]:mt-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-4 [&_li]:text-[15px] [&_li]:leading-6 [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-4 [&_pre]:my-4 [&_pre]:rounded-lg [&_pre]:bg-neutral-100 [&_pre]:p-3 [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:py-0.5 [&_em]:not-italic [&_em]:text-neutral-500";

export function BookmarkItem({ bookmark, onDelete }: BookmarkItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const isTextNote = bookmark.url.startsWith("note://");
  const isImageBookmark = bookmark.tags?.includes("images") ?? false;
  const isLoading = bookmark.id.startsWith("temp-");
  const hasOgImage = bookmark.image_url && bookmark.image_url.trim().length > 0;
  const faviconUrl =
    isTextNote || isImageBookmark ? null : getFaviconUrl(bookmark.url);

  const displayText = isTextNote
    ? stripMarkdown(bookmark.notes ?? bookmark.title ?? "Note")
    : isImageBookmark
    ? bookmark.title ?? bookmark.description ?? "Saved image"
    : bookmark.title ?? bookmark.url;

  const icon =
    isTextNote && hasOgImage ? (
      <div className="h-[50px] w-[80px] shrink-0 overflow-hidden rounded-lg bg-neutral-100 relative">
        <img
          src={bookmark.image_url!}
          alt=""
          width={90}
          height={60}
          className="absolute inset-0 h-full w-full object-cover object-center"
          style={{ objectFit: "cover", display: "block" }}
        />
      </div>
    ) : isTextNote ? (
      <div className="h-12 w-15 shrink-0 rounded-full bg-neutral-200" />
    ) : isImageBookmark ? (
      <div className="h-[50px] w-[80px] shrink-0 overflow-hidden rounded-lg bg-neutral-100 relative">
        <img
          src={bookmark.image_url ?? bookmark.url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          style={{ objectFit: "cover", display: "block" }}
        />
      </div>
    ) : isLoading ? (
      <div className="h-12 w-15 shrink-0 animate-pulse rounded-full bg-neutral-200" />
    ) : hasOgImage ? (
      <div className="h-[50px] w-[80px] shrink-0 overflow-hidden rounded-lg bg-neutral-100 relative">
        <img
          src={bookmark.image_url!}
          alt=""
          width={80}
          height={50}
          className="absolute inset-0 h-full w-full object-cover object-center"
          style={{ objectFit: "cover", display: "block" }}
        />
      </div>
    ) : faviconUrl ? (
      <img
        src={faviconUrl}
        alt=""
        width={80}
        height={50}
        className="h-12 w-15 shrink-0 rounded-full"
      />
    ) : (
      <div className="h-12 w-15 shrink-0 rounded-full bg-neutral-200" />
    );

  const mainContent = (
    <div className="flex min-w-0 flex-1 items-center gap-3 pr-8">
      {icon}
      <div
        className={`min-w-0 flex-1 flex flex-col min-h-[2.5rem] ${
          isTextNote ? "justify-center" : ""
        }`}
      >
        {isLoading && !isTextNote ? (
          <>
            <div className="h-[20px] w-48 skeleton-box" />
            <p className="truncate text-neutral-400 text-sm">{bookmark.url}</p>
          </>
        ) : (
          <>
            <p className="truncate leading-5">{displayText}</p>
            {!isTextNote && (isImageBookmark || bookmark.title) && (
              <p className="truncate text-neutral-400 text-sm">
                {isImageBookmark &&
                bookmark.notes &&
                bookmark.notes.startsWith("http")
                  ? bookmark.notes
                  : bookmark.url}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );

  const actionButtons = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(bookmark.id);
        }}
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition ring-1 ring-neutral-200 shadow-xs bg-white hover:bg-neutral-100/80 hover:text-neutral-800 active:scale-[0.97] ${
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
  );

  const noteDialogContent = (
    <AlertDialogContent
      className="max-h-[85vh] !max-w-3xl overflow-y-auto"
      onOverlayClick={() => setDialogOpen(false)}
    >
      <AlertDialogHeader>
        <AlertDialogTitle className="sr-only">Details</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="text-left">
            <div className="prose prose-neutral prose-sm max-w-none [&_p]:my-4 [&_p]:text-[15px] [&_p]:leading-6 [&_p]:text-neutral-800 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:mb-2 [&_h3]:mt-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-4 [&_li]:text-[15px] [&_li]:leading-6 [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-4 [&_pre]:my-4 [&_pre]:rounded-lg [&_pre]:bg-neutral-100 [&_pre]:p-3 [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:py-0.5 [&_em]:not-italic [&_em]:text-neutral-500">
              <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                {bookmark.notes ?? ""}
              </ReactMarkdown>
            </div>
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
        <div className="flex w-full items-center justify-between px-4">
          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-center py-2.5 text-left text-neutral-800"
              >
                {mainContent}
              </button>
            </AlertDialogTrigger>
            {noteDialogContent}
          </AlertDialog>
          {actionButtons}
        </div>
      </li>
    );
  }

  return (
    <li
      className="hover:bg-neutral-100/50 rounded-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex w-full items-center justify-between px-4">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 flex-1 cursor-pointer items-center py-2.5 text-left text-neutral-800 hover:text-neutral-950"
        >
          {mainContent}
        </a>
        {actionButtons}
      </div>
    </li>
  );
}
