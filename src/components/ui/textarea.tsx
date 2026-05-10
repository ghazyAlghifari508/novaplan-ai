import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[100px] w-full rounded-lg border border-border-subtle bg-white px-4 py-3 text-base text-primary-black placeholder:text-text-gray/50 focus:border-primary-black focus:outline-none focus:ring-2 focus:ring-primary-black/5 transition-all duration-200 disabled:opacity-50 resize-y",
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";