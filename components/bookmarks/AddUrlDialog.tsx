"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AddUrlDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (url: string) => Promise<{ error?: string }>;
  checkDuplicateUrl: (url: string) => boolean;
};

export function AddUrlDialog({
  open,
  onOpenChange,
  onAdd,
  checkDuplicateUrl,
}: AddUrlDialogProps) {
  const [urlValue, setUrlValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset value when dialog opens
  useEffect(() => {
    if (open) {
      setUrlValue("");
      setError(null);
    }
  }, [open]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const url = urlValue.trim();
    if (!url) {
      setError("URL cannot be empty");
      return;
    }

    // Validate URL using HTML5 validation
    if (inputRef.current && !inputRef.current.validity.valid) {
      setError("Please enter a valid URL");
      return;
    }

    // Check for duplicate
    if (checkDuplicateUrl(url)) {
      setError("URL already exists");
      return;
    }

    // Clear error and close dialog
    setError(null);
    const urlToAdd = url;
    setUrlValue("");

    setIsAdding(true);
    const result = await onAdd(urlToAdd);
    setIsAdding(false);

    if (result.error) {
      // If it's a duplicate error, show success toast (handled by parent)
      // Otherwise, show error
      if (result.error !== "DUPLICATE_BOOKMARK") {
        setError(result.error);
      }
    } else {
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isAdding) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape" && !isAdding) {
      e.preventDefault();
      onOpenChange(false);
      setUrlValue("");
      setError(null);
    }
  };

  const handlePasteClick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlValue(text);
        setError(null);
        inputRef.current?.focus();
      }
    } catch (err) {
      // Fallback: try using document.execCommand for older browsers
      if (inputRef.current) {
        inputRef.current.focus();
        document.execCommand("paste");
      }
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => {
        if (!isAdding) {
          onOpenChange(open);
          if (!open) {
            setUrlValue("");
            setError(null);
          }
        }
      }}
    >
      <AlertDialogContent
        onOverlayClick={() => {
          if (!isAdding) {
            onOpenChange(false);
            setUrlValue("");
            setError(null);
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Add URL</AlertDialogTitle>
        </AlertDialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="relative">
              <input
                ref={inputRef}
                type="url"
                value={urlValue}
                onChange={(e) => {
                  setUrlValue(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                required
                disabled={isAdding}
                className={`w-full rounded-lg ring-1 shadow-sm focus-within:shadow pl-3 pr-10 py-2 focus:outline-none disabled:opacity-50 ${
                  error
                    ? "ring-red-600 focus-within:ring-red-400"
                    : "ring-neutral-200 focus-within:ring-neutral-300"
                }`}
                placeholder="https://"
              />
              <button
                type="button"
                onClick={handlePasteClick}
                disabled={isAdding}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800 active:scale-[0.97] transition p-1 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:pointer-events-none"
                title="Paste URL"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <rect
                    x="8"
                    y="2"
                    width="8"
                    height="4"
                    rx="1"
                    ry="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!urlValue.trim() || isAdding}
              className="bg-neutral-800 hover:bg-neutral-700 active:scale-[0.97] disabled:opacity-50 h-10 px-3 relative overflow-hidden min-w-[100px] flex items-center justify-center rounded-lg text-white font-medium transition text-sm focus:outline-none focus:ring-0 disabled:pointer-events-none"
            >
              {isAdding ? (
                <span className="h-5 w-5 border-2 border-[#e0e0e0] border-t-[#888] rounded-full animate-spin" />
              ) : (
                "Add to Shelf"
              )}
            </button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
