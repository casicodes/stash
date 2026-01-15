"use client";

import { useEffect, useCallback, RefObject } from "react";
import type { InputMode } from "@/types/bookmark";

type ShortcutHandlers = {
  onAddMode: () => void;
  onSearchMode: () => void;
  onEscape: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
};

export function useKeyboardShortcuts({
  onAddMode,
  onSearchMode,
  onEscape,
  inputRef,
}: ShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const isCmdF = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f";

      if (isCmdK) {
        e.preventDefault();
        onAddMode();
        inputRef.current?.focus();
      }

      if (isCmdF) {
        e.preventDefault();
        onSearchMode();
        inputRef.current?.focus();
      }

      // Use Shift+T to switch from search mode to add mode
      // (ESC is reserved for closing dialogs)
      const isShiftT = e.shiftKey && e.key.toLowerCase() === "t";
      if (isShiftT) {
        e.preventDefault();
        onEscape();
        inputRef.current?.blur();
      }
    },
    [onAddMode, onSearchMode, onEscape, inputRef]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
