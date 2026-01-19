"use client";

import { forwardRef } from "react";

type BookmarkInputProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onClearSearch?: () => void;
  isLoading?: boolean;
};

export const BookmarkInput = forwardRef<HTMLInputElement, BookmarkInputProps>(
  function BookmarkInput({ searchValue, onSearchChange, onClearSearch, isLoading = false }, ref) {
    return (
      <form className="w-full" onSubmit={(e) => e.preventDefault()}>
        <div className="flex items-center gap-2 rounded-md ring-1 ring-neutral-200 shadow-sm focus-within:shadow focus-within:ring-neutral-300 px-2 py-0.5 transition-shadow">
          <svg
            className="h-4 w-4 flex-shrink-0 text-neutral-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            ref={ref}
            className={`h-7 text-sm w-full bg-transparent outline-none placeholder:text-neutral-400 ${
              isLoading && searchValue.trim() ? "text-shimmer" : ""
            }`}
            placeholder="Search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchValue.trim() && onClearSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              className="flex items-center justify-center text-neutral-500 hover:text-neutral-800 transition-transform active:scale-[0.97] cursor-pointer"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </form>
    );
  }
);
