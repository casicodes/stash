"use client";

import { forwardRef } from "react";
import type { InputMode } from "@/types/bookmark";

type BookmarkInputProps = {
  mode: InputMode;
  addValue: string;
  searchValue: string;
  onAddChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSubmit: () => void;
};

export const BookmarkInput = forwardRef<HTMLInputElement, BookmarkInputProps>(
  function BookmarkInput(
    { mode, addValue, searchValue, onAddChange, onSearchChange, onSubmit },
    ref
  ) {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (mode === "add") {
        onSubmit();
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (mode !== "add") return;

      const plainText = e.clipboardData.getData("text");

      // Preserve newlines in plain text
      if (plainText.includes("\n")) {
        e.preventDefault();
        onAddChange(plainText);
      }
    };

    return (
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 rounded-md ring-1 ring-neutral-200 shadow-sm focus-within:shadow focus-within:ring-neutral-300 px-2 py-0.5 transition-shadow">
          {mode === "add" ? (
            <svg
              className="h-5 w-5 text-neutral-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M12 5v14m-7-7h14" strokeLinecap="round" />
            </svg>
          ) : (
            <svg
              className="h-5 w-5 text-neutral-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
          )}
          <input
            ref={ref}
            className="h-7 text-sm w-full bg-transparent outline-none placeholder:text-neutral-400"
            placeholder={
              mode === "add" ? "Insert a link or just plain text..." : "Search"
            }
            value={mode === "add" ? addValue : searchValue}
            onChange={(e) =>
              mode === "add"
                ? onAddChange(e.target.value)
                : onSearchChange(e.target.value)
            }
            onPaste={handlePaste}
          />
          <div className="flex items-center gap-1">
            {mode === "add" ? (
              <>
                <span className="text-sm flex size-5 items-center justify-center rounded-md bg-neutral-100/50 text-xs font-medium  text-neutral-500">
                  ⌘
                </span>
                <span className="text-sm flex size-5 items-center justify-center rounded-md bg-neutral-100/50 text-xs font-medium text-neutral-500">
                  F
                </span>
              </>
            ) : (
              <span className="text-sm flex h-5 px-2 items-center justify-center rounded-md bg-neutral-100/50 text-xs font-medium text-neutral-500">
                Esc
              </span>
            )}
          </div>
        </div>
      </form>
    );
  }
);
