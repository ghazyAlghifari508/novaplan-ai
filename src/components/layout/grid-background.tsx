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
            "radial-gradient(ellipse 100% 75% at 50% 0%, black 0%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 100% 75% at 50% 0%, black 0%, transparent 100%)",
        }}
      />

      {/* Center glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% -10%, var(--glow-color) 0%, transparent 70%)",
        }}
      />

      {/* CSS vars for light/dark */}
      <style>{`
        :root {
          --grid-line: rgba(0, 0, 0, 0.18);
          --glow-color: rgba(90, 225, 76, 0.08);
        }
        .dark {
          --grid-line: rgba(255, 255, 255, 0.14);
          --glow-color: rgba(90, 225, 76, 0.07);
        }
      `}</style>
    </div>
  );
}
