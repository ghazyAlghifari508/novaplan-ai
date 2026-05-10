import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "transparent";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primary: "bg-primary-black text-white hover:bg-text-gray",
      secondary: "bg-light-gray-bg text-primary-black hover:bg-border-subtle",
      ghost: "bg-transparent text-text-gray hover:bg-light-gray-bg",
      danger: "bg-red-600 text-white hover:bg-red-700",
      transparent: "bg-overlay-dark text-white backdrop-blur-sm hover:bg-black/40",
    };

    const sizes = {
      sm: "h-9 px-4 text-sm rounded-md",
      md: "h-11 px-6 text-base rounded-lg",
      lg: "h-14 px-8 text-lg rounded-xl",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";