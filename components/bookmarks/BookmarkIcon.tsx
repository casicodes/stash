"use client";

import type { BookmarkViewModel } from "@/lib/bookmarks/viewModel";
import { NewBadge } from "./NewBadge";

type BookmarkIconProps = {
  bookmark: { image_url: string | null; url: string };
  viewModel: BookmarkViewModel;
  showNewTag: boolean;
};

export function BookmarkIcon({
  bookmark,
  viewModel,
  showNewTag,
}: BookmarkIconProps) {
  const { isTextNote, isImageBookmark, isLoading, hasOgImage, faviconUrl, iconUrl } =
    viewModel;

  // Text note with OG image
  if (isTextNote && hasOgImage) {
    return (
      <div className="h-[50px] w-[80px] shrink-0 overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-neutral-100 relative">
        <NewBadge show={showNewTag} variant="square" />
        <img
          src={iconUrl!}
          alt=""
          width={90}
          height={60}
          className="absolute inset-0 h-full w-full object-cover object-center"
          style={{ objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }

  // Text note without image
  if (isTextNote) {
    return (
      <div className="h-12 w-12 shrink-0 rounded-full bg-neutral-200 relative">
        <NewBadge show={showNewTag} variant="pill" className="-top-1 -left-1" />
      </div>
    );
  }

  // Image bookmark
  if (isImageBookmark) {
    return (
      <div className="h-[50px] w-[80px] shrink-0 overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-neutral-100 relative">
        <NewBadge show={showNewTag} variant="pill" />
        <img
          src={iconUrl ?? bookmark.url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          style={{ objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-[50px] w-[80px] shrink-0 animate-pulse rounded-lg bg-neutral-100 ring-1 ring-neutral-100 relative">
        <NewBadge show={showNewTag} variant="pill" />
      </div>
    );
  }

  // Link with OG image
  if (hasOgImage) {
    return (
      <div className="h-[50px] w-[80px] shrink-0 overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-neutral-100 relative">
        <NewBadge show={showNewTag} variant="pill" />
        <img
          src={iconUrl!}
          alt=""
          width={80}
          height={50}
          className="absolute inset-0 h-full w-full object-cover object-center"
          style={{ objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }

  // Link with favicon
  if (faviconUrl) {
    return (
      <div className="h-[50px] w-20 shrink-0 bg-neutral-100 ring-1 ring-neutral-100 rounded overflow-hidden flex items-center justify-center relative">
        <NewBadge show={showNewTag} variant="pill" />
        <img
          src={faviconUrl}
          alt=""
          width={20}
          height={20}
          className="w-5 h-5 object-contain"
        />
      </div>
    );
  }

  // Default fallback
  return (
    <div className="h-12 w-12 shrink-0 rounded-full bg-neutral-200 relative">
      <NewBadge show={showNewTag} variant="pill" className="-top-1 -left-1" />
    </div>
  );
}
