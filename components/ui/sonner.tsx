"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      duration={4000}
      className="toaster group"
      style={{ "--width": "400px" } as React.CSSProperties}
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-white text-neutral-950 border border-neutral-200 shadow-lg rounded-lg text-base !overflow-hidden",
          title: "truncate !max-w-[280px]",
          description: "text-neutral-500",
          actionButton:
            "!text-white !h-8 !px-3 !text-sm !rounded-lg hover:!bg-neutral-700 !transition-colors active:!scale-[0.97]",
          cancelButton: "bg-neutral-100 text-neutral-500",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
