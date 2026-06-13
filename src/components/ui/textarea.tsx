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
        "flex min-h-[100px] w-full rounded-md bg-steel px-3 py-3 text-sm text-snow shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)] placeholder:text-slate focus:outline-none focus:ring-1 focus:ring-indigo/80 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:cursor-not-allowed disabled:opacity-50 resize-y",
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";
