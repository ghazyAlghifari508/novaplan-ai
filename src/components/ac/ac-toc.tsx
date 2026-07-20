"use client";

import { memo } from "react";
import type { AcFeature } from "@/types/database";
import { cn } from "@/lib/utils";

interface AcTocProps {
  features: AcFeature[];
  activeFeature?: string;
  onFeatureClick?: (featureName: string) => void;
  className?: string;
}

/**
 * AC Table of Contents — renders feature names as clickable links.
 */
export const AcToc = memo(function AcToc({
  features,
  activeFeature,
  onFeatureClick,
  className,
}: AcTocProps) {
  if (!features || features.length === 0) {
    return (
      <div className={cn("p-4 text-sm text-fog italic", className)}>
        Belum ada fitur
      </div>
    );
  }

  return (
    <nav className={cn("space-y-1 p-4", className)}>
      <h3 className="mb-3 text-xs font-[510] uppercase tracking-wider text-fog/60">
        Daftar Fitur
      </h3>
      <ul className="space-y-1">
        {features.map((feature, idx) => (
          <li key={idx}>
            <button
              onClick={() => onFeatureClick?.(feature.featureName)}
              className={cn(
                "w-full rounded px-2 py-1.5 text-left text-sm transition-colors",
                activeFeature === feature.featureName
                  ? "bg-indigo/20 text-snow"
                  : "text-fog hover:bg-white/5 hover:text-snow"
              )}
            >
              {feature.featureName}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
});
