import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ children, className, onClick, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border-subtle bg-white p-6 transition-all duration-200",
        hover &&
          "cursor-pointer hover:shadow-md hover:border-primary-black/10 hover:-translate-y-0.5",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}