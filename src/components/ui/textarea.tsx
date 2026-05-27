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
        "flex min-h-[100px] w-full rounded-lg border border-border-subtle dark:border-white/10 bg-white dark:bg-[#1E1E1E] px-4 py-3 text-base text-primary-black dark:text-[#F0F0F0] placeholder:text-text-gray dark:text-[#A0A0A0]/50 focus:border-primary-black focus:outline-none focus:ring-2 focus:ring-primary-black/5 transition-all duration-200 disabled:opacity-50 resize-y",
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";