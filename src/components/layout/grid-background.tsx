"use client";

import { cn } from "@/lib/utils";

interface GridBackgroundProps {
  className?: string;
}

export function GridBackground({ className }: GridBackgroundProps) {
  return (
    <div
      className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
    >
      {/* Grid lines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse 90% 65% at 50% 0%, black 0%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 65% at 50% 0%, black 0%, transparent 100%)",
        }}
      />

      {/* Center glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% -15%, var(--grid-glow) 0%, transparent 68%)",
        }}
      />

      {/* CSS vars for light/dark */}
      <style>{`
        :root {
          --grid-line: rgba(9, 9, 11, 0.15);
          --grid-glow: rgba(9, 9, 11, 0.07);
        }
        .dark {
          --grid-line: rgba(208, 214, 224, 0.15);
          --grid-glow: rgba(247, 248, 248, 0.1);
        }
      `}</style>
    </div>
  );
}
