"use client";

import { memo } from "react";
import { Lock, Globe } from "lucide-react";
import type { SitemapPage } from "@/lib/services/sitemap-service";
import { cn } from "@/lib/utils";

interface SitemapNodeProps {
  page: SitemapPage;
}

/**
 * Single page card in the sitemap tree.
 * Renders icon (Lock auth / Globe public), name, path, auth badge.
 * Children are rendered by the parent tree layout, not here — keeps the card
 * a pure leaf so memo holds across zoom/pan re-renders.
 */
export const SitemapNode = memo(function SitemapNode({ page }: SitemapNodeProps) {
  const isAuth = page.isAuthRequired;
  return (
    <div
      className={cn(
        "w-[180px] overflow-hidden rounded-lg border bg-obsidian p-3 shadow-md",
        isAuth ? "border-indigo/60" : "border-emerald/60",
      )}
    >
      <div className="flex items-center gap-2">
        {isAuth ? (
          <Lock size={14} aria-hidden className="shrink-0 text-indigo" />
        ) : (
          <Globe size={14} aria-hidden className="shrink-0 text-emerald" />
        )}
        <span className="truncate font-inter text-sm font-[510] text-snow" title={page.name}>
          {page.name}
        </span>
      </div>
      <code className="mt-1 block truncate font-mono text-[11px] text-fog" title={page.path}>
        {page.path}
      </code>
      <span
        className={cn(
          "mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-[510]",
          isAuth ? "bg-indigo/15 text-indigo" : "bg-emerald/15 text-emerald",
        )}
      >
        {isAuth ? "Auth required" : "Public"}
      </span>
    </div>
  );
});
