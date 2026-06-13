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
        "flex h-11 w-full rounded-md bg-steel px-3 text-sm text-snow shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)] placeholder:text-slate focus:outline-none focus:ring-1 focus:ring-indigo/80 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";
