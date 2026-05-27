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
        "flex h-11 w-full rounded-lg border border-border-subtle dark:border-white/10 bg-white dark:bg-[#1E1E1E] px-4 text-base text-primary-black dark:text-[#F0F0F0] placeholder:text-text-gray dark:text-[#A0A0A0]/50 focus:border-primary-black focus:outline-none focus:ring-2 focus:ring-primary-black/5 transition-all duration-200 disabled:opacity-50 disabled:bg-light-gray-bg dark:bg-[#161616]",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";