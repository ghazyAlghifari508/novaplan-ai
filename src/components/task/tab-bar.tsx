"use client";

import { cn } from "@/lib/utils";

export type TaskTab = "board" | "sitemap";

interface TabBarProps {
  active: TaskTab;
  onChange: (tab: TaskTab) => void;
  /** Sitemap tab is disabled until PRD-06 ships. */
  sitemapEnabled?: boolean;
  className?: string;
}

/**
 * Tab bar switching between the Task Board and Sitemap views.
 * Shared shell with PRD-06 (Sitemap tab wiring lands there).
 */
export function TabBar({ active, onChange, sitemapEnabled = false, className }: TabBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Tampilan task"
      className={cn("flex items-center gap-1 rounded-lg border border-graphite bg-charcoal p-1", className)}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === "board"}
        onClick={() => onChange("board")}
        className={cn(
          "rounded px-3 py-1.5 text-sm font-[510] transition-colors",
          active === "board" ? "bg-indigo text-white" : "text-fog hover:bg-white/5 hover:text-snow",
        )}
      >
        Task Board
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "sitemap"}
        aria-disabled={!sitemapEnabled}
        disabled={!sitemapEnabled}
        onClick={() => sitemapEnabled && onChange("sitemap")}
        title={sitemapEnabled ? undefined : "Segera hadir"}
        className={cn(
          "rounded px-3 py-1.5 text-sm font-[510] transition-colors",
          active === "sitemap" ? "bg-indigo text-white" : "text-fog hover:bg-white/5 hover:text-snow",
          !sitemapEnabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-fog",
        )}
      >
        Sitemap
      </button>
    </div>
  );
}
