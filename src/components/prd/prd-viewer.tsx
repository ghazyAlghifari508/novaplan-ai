"use client";

import { useState, useRef, useEffect, useMemo, memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { TableOfContents } from "./table-of-contents";
import { Mermaid } from "./mermaid";
import { usePanelResize } from "@/hooks/use-panel-resize";
import { cn } from "@/lib/utils";
import type { Plan } from "@/types/database";
import { VersionHistory } from "./version-history";

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
  onSelectVersion?: (content: string) => void;
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
    return cleaned.trim();
  }, [content]);

  return (
    <div className={cn("flex h-full", className)}>
      <aside
        style={{ width: `${leftWidth}px`, background: "var(--bg-page)" }}
        className={cn(
          "relative hidden h-full shrink-0 overflow-y-auto border-r border-graphite bg-onyx p-4 md:block",
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
                  return <Mermaid chart={String(children).replace(/\n$/, "")} />;
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

        {/* Floating Version History button — bottom-right corner */}
        {versions && versions.length > 1 && (
          <div className="fixed bottom-6 right-6 z-50 print:hidden">
            <VersionHistory
              versions={versions}
              currentVersion={currentVersion || 1}
              onSelectVersion={(content) => onSelectVersion?.(content)}
              plan={plan}
            />
          </div>
        )}
      </div>
    </div>
  );
});
