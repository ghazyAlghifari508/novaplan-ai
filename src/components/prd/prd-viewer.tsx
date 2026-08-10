"use client";

import { useState, useRef, useEffect, useMemo, memo, lazy, Suspense } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { TableOfContents } from "./table-of-contents";

// ponytail: lazy-load Mermaid so the ~2-3MB mermaid library (layout engines,
// flowchart/sequence/class parsers) stays out of the main PRD chunk. Only
// fetched when a PRD actually contains a mermaid code fence. autoCodeSplitting
// handles route-level split; this handles component-level split within a route.
const Mermaid = lazy(() => import("./mermaid").then((m) => ({ default: m.Mermaid })));
import { VersionHistory } from "./version-history";
import { usePanelResize } from "@/hooks/use-panel-resize";
import { cn } from "@/lib/utils";
import type { Plan } from "@/types/database";

interface PrdVersion {
  id: string;
  version: number;
  content: string;
  change_summary: string | null;
  created_at: string;
}

interface PrdViewerProps {
  content: string;
  projectName: string;
  className?: string;
  plan?: Plan;
  versions?: PrdVersion[];
  currentVersion?: number;
  onSelectVersion?: (content: string, version: number) => void;
}

export const PrdViewer = memo(function PrdViewer({
  content,
  projectName,
  className,
  plan = "free",
  versions,
  currentVersion,
  onSelectVersion,
}: PrdViewerProps) {
  const { leftWidth, onStartDragLeft, isDraggingLeft } = usePanelResize();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic when new content arrives
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // If we're within 150px of the bottom, auto scroll down to follow new content
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      if (isNearBottom) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [content]);

  // Membersihkan sisa tag markdown (misal ```markdown di awal dan ``` di akhir)
  // yang sering kali ditambahkan secara otomatis oleh AI.
  // ponytail: memoize by `content` so we don't re-run the regex chain on every
  // render delta (PRD streaming can produce 200+ renders).
  const cleanContent = useMemo(() => {
    let cleaned = content.replace(/<!--[\s\S]*?-->/g, "").trim();

    const startMatch = cleaned.match(/```(?:markdown|md)\s*\n/i);

    if (startMatch) {
      if (startMatch.index !== undefined && startMatch.index < 500) {
        const startIndex = startMatch.index + startMatch[0].length;
        const lastIndex = cleaned.lastIndexOf("```");

        if (lastIndex > startIndex) {
          cleaned = cleaned.substring(startIndex, lastIndex);
        } else {
          cleaned = cleaned.substring(startIndex);
        }
      }
    } else {
      if (cleaned.startsWith("```\n")) {
        const lastIndex = cleaned.lastIndexOf("```");
        if (lastIndex > 3) {
          cleaned = cleaned.substring(4, lastIndex);
        }
      } else if (cleaned.startsWith("```")) {
        const lastIndex = cleaned.lastIndexOf("```");
        if (lastIndex > 2) {
          cleaned = cleaned.substring(3, lastIndex);
        }
      }
    }
    // Strip ===DONE=== marker that AI outputs as completion signal.
    // Stop sequence should catch it, but sometimes it leaks into saved content.
    cleaned = cleaned.replace(/={3,}DONE={3,}/gi, "").trim();

    return cleaned.trim();
  }, [content]);

  // Skeleton when content is empty (first load or waiting for AI stream)
  if (!cleanContent) {
    return (
      <div className={cn("flex h-full", className)}>
        <aside
          style={{ width: `${leftWidth}px`, background: "var(--bg-page)" }}
          className="relative hidden h-full shrink-0 overflow-y-auto overflow-x-hidden border-r border-graphite bg-onyx p-4 md:block"
        >
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-3.5 rounded bg-steel/15 animate-pulse" style={{ width: `${55 + (i % 3) * 15}%` }} />
            ))}
          </div>
        </aside>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto">
            <article className="prd-content mx-auto max-w-3xl px-8 pb-16 pt-8 text-mist">
              <div className="h-8 w-48 rounded bg-steel/20 animate-pulse mb-8" />
              <div className="space-y-3 mb-10">
                <div className="h-3.5 w-full rounded bg-steel/15 animate-pulse" />
                <div className="h-3.5 w-5/6 rounded bg-steel/15 animate-pulse" />
                <div className="h-3.5 w-4/5 rounded bg-steel/15 animate-pulse" />
              </div>
              <div className="h-6 w-40 rounded bg-steel/20 animate-pulse mb-5" />
              <div className="space-y-3 mb-10">
                <div className="h-3.5 w-full rounded bg-steel/15 animate-pulse" />
                <div className="h-3.5 w-11/12 rounded bg-steel/15 animate-pulse" />
                <div className="h-3.5 w-3/4 rounded bg-steel/15 animate-pulse" />
                <div className="h-3.5 w-5/6 rounded bg-steel/15 animate-pulse" />
              </div>
              <div className="h-6 w-36 rounded bg-steel/20 animate-pulse mb-5" />
              <div className="space-y-3">
                <div className="h-3.5 w-full rounded bg-steel/15 animate-pulse" />
                <div className="h-3.5 w-2/3 rounded bg-steel/15 animate-pulse" />
                <div className="h-3.5 w-4/5 rounded bg-steel/15 animate-pulse" />
              </div>
            </article>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full", className)}>
      <aside
        style={{ width: `${leftWidth}px`, background: "var(--bg-page)" }}
        className={cn(
          "relative hidden h-full shrink-0 overflow-y-auto overflow-x-hidden border-r border-graphite bg-onyx p-4 md:block",
          !isDraggingLeft && "transition-[width] duration-300",
        )}
      >
        <TableOfContents content={content} />
        {/* Drag handle */}
        <div
          className="absolute right-[-4px] top-0 z-10 h-full w-2 cursor-col-resize transition-colors hover:bg-indigo/20"
          onMouseDown={onStartDragLeft}
        />
      </aside>

      {/* Content area: VersionHistory header + scrollable content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Version History header - only spans content area, not TOC */}
        {versions && versions.length > 1 && (
          <div className="shrink-0 border-b border-graphite bg-charcoal/40 px-4 py-2">
            <div className="mx-auto max-w-3xl flex justify-end">
              <VersionHistory
                versions={versions}
                currentVersion={currentVersion || 1}
                onSelectVersion={onSelectVersion || (() => {})}
                plan={plan}
              />
            </div>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto relative scroll-smooth">

        <article className="prd-content mx-auto max-w-3xl px-8 pb-16 pt-8 text-mist">
          <Markdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              h2: ({ children, ...props }) => {
                const text = String(children).replace(/<[^>]*>/g, "");
                const id = text.toLowerCase().replace(/[^\w]+/g, "-");
                return (
                  <h2 id={id} {...props}>
                    {children}
                  </h2>
                );
              },
              h3: ({ children, ...props }) => {
                const text = String(children).replace(/<[^>]*>/g, "");
                const id = text.toLowerCase().replace(/[^\w]+/g, "-");
                return (
                  <h3 id={id} {...props}>
                    {children}
                  </h3>
                );
              },
              h4: ({ children, ...props }) => {
                const text = String(children).replace(/<[^>]*>/g, "");
                const id = text.toLowerCase().replace(/[^\w]+/g, "-");
                return (
                  <h4 id={id} {...props}>
                    {children}
                  </h4>
                );
              },
              code: ({ inline, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || "");
                if (!inline && match && match[1] === "mermaid") {
                  return (
                    <Suspense fallback={<div className="animate-pulse bg-black/5 dark:bg-white/5 h-32 rounded-lg my-6" />}>
                      <Mermaid chart={String(children).replace(/\n$/, "")} />
                    </Suspense>
                  );
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {cleanContent}
          </Markdown>
        </article>

        </div>
      </div>
    </div>
  );
});
