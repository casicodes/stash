"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type RenameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTitle: string;
  onRename: (title: string) => Promise<{ error?: string }>;
};

export function RenameDialog({
  open,
  onOpenChange,
  currentTitle,
  onRename,
}: RenameDialogProps) {
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Reset value when dialog opens
  useEffect(() => {
    if (open) {
      setRenameValue(currentTitle);
    }
  }, [open, currentTitle]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && renameInputRef.current) {
      setTimeout(() => {
        renameInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleRename = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    const trimmedValue = renameValue.trim();
    if (!trimmedValue) {
      toast.error("Title cannot be empty");
      return;
    }

    setIsRenaming(true);
    const { error } = await onRename(trimmedValue);
    setIsRenaming(false);

    if (error) {
      toast.error(error);
    } else {
      onOpenChange(false);
      setRenameValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isRenaming) {
      e.preventDefault();
      handleRename();
    } else if (e.key === "Escape" && !isRenaming) {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  const displayTitle =
    currentTitle.length > 50 ? `${currentTitle.slice(0, 50)}...` : currentTitle;

  const hasChanged = renameValue.trim() !== currentTitle.trim();
  const isEmpty = renameValue.trim() === "";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => {
        if (!isRenaming) {
          onOpenChange(open);
        }
      }}
    >
      <AlertDialogContent
        onOverlayClick={() => {
          if (!isRenaming) {
            onOpenChange(false);
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            Rename <span className="text-neutral-500">"{displayTitle}"</span> to
          </AlertDialogTitle>
        </AlertDialogHeader>
        <div className="flex flex-col gap-4">
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg ring-1 ring-neutral-200 shadow-sm focus-within:shadow focus-within:ring-neutral-300 px-3 py-2 focus:border-neutral-400 focus:outline-none"
            placeholder="Enter new title"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleRename}
              disabled={isRenaming || !hasChanged || isEmpty}
              className="bg-neutral-800 hover:bg-neutral-700 active:scale-[0.97] disabled:opacity-50 h-10 px-3 relative overflow-hidden min-w-[100px] flex items-center justify-center rounded-lg text-white font-medium transition text-sm focus:outline-none focus:ring-0 disabled:pointer-events-none"
            >
              <AnimatePresence mode="wait">
                {isRenaming ? (
                  <motion.span
                    key="spinner"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-5 w-5 border-2 border-[#e0e0e0] border-t-[#888] rounded-full animate-spin"
                  />
                ) : (
                  <motion.span
                    key="label"
                    initial={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    Rename
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
