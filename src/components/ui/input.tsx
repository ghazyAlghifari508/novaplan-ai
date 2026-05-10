import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-lg border border-border-subtle bg-white px-4 text-base text-primary-black placeholder:text-text-gray/50 focus:border-primary-black focus:outline-none focus:ring-2 focus:ring-primary-black/5 transition-all duration-200 disabled:opacity-50 disabled:bg-light-gray-bg",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";