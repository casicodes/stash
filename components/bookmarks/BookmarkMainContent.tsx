"use client";

import type { BookmarkViewModel } from "@/lib/bookmarks/viewModel";

type BookmarkMainContentProps = {
  viewModel: BookmarkViewModel;
  bookmark: { url: string; notes: string | null };
  isFirst?: boolean;
};

export function BookmarkMainContent({
  viewModel,
  bookmark,
  isFirst = false,
}: BookmarkMainContentProps) {
  const { isLoading, isTextNote, primaryText, secondaryText } = viewModel;

  if (isLoading && !isTextNote) {
    return (
      <div
        className={`min-w-0 flex-1 flex flex-col min-h-[2.5rem] ${
          isTextNote ? "justify-center" : ""
        }`}
      >
        <div className="h-[20px] w-48 skeleton-box" />
        <p className="truncate text-neutral-400 text-sm">{bookmark.url}</p>
      </div>
    );
  }

  return (
    <div
      className={`min-w-0 flex-1 flex flex-col min-h-[2.5rem] ${
        isTextNote ? "justify-center" : ""
      }`}
    >
      <p className="truncate leading-5">{primaryText}</p>
      {secondaryText && (
        <p className="truncate text-neutral-400 text-sm">{secondaryText}</p>
      )}
    </div>
  );
}
