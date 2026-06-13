import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "info";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  size = "sm",
  className,
}: BadgeProps) {
  const variants = {
    default: "bg-obsidian text-mist shadow-[var(--shadow-inset)]",
    success: "bg-emerald/10 text-emerald shadow-[inset_0_0_0_1px_rgba(39,166,68,0.35)]",
    warning: "bg-steel text-snow shadow-[inset_0_0_0_1px_var(--color-graphite)]",
    info: "bg-indigo/10 text-mist shadow-[inset_0_0_0_1px_rgba(94,106,210,0.35)]",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] font-[510]",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
