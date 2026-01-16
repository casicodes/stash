"use client";

import { motion, AnimatePresence } from "framer-motion";

type NewBadgeProps = {
  show: boolean;
  variant?: "square" | "pill";
  className?: string;
};

export function NewBadge({ show, variant = "pill", className = "" }: NewBadgeProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className={`absolute top-1 left-1 z-20 bg-gradient-to-b from-[#FF5968] to-[#ED0117] px-2 py-0.5 text-xs font-medium text-white shadow-sm ${
            variant === "pill" ? "rounded-full" : "rounded"
          } ${className}`}
        >
          New
        </motion.div>
      )}
    </AnimatePresence>
  );
}
