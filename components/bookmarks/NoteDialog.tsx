"use client";

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const markdownProseClassName =
  "prose prose-neutral prose-sm max-w-none [&_p]:my-4 [&_p]:text-[15px] [&_p]:leading-6 [&_p]:text-neutral-800 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:mb-2 [&_h3]:mt-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-4 [&_li]:text-[15px] [&_li]:leading-6 [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-4 [&_pre]:my-4 [&_pre]:rounded-lg [&_pre]:bg-neutral-100 [&_pre]:p-3 [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:py-0.5 [&_em]:not-italic [&_em]:text-neutral-500 [&_hr~p_em]:text-neutral-500";

type NoteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: string | null;
  trigger: React.ReactNode;
};

export function NoteDialog({
  open,
  onOpenChange,
  notes,
  trigger,
}: NoteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="max-h-[85vh] !max-w-xl overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="sr-only">Details</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-left">
              <div className={markdownProseClassName}>
                <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                  {notes ?? ""}
                </ReactMarkdown>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
}
