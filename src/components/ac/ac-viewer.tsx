"use client";

import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { AcFeature, Plan } from "@/types/database";
import { Check, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface AcViewerProps {
  content: AcFeature[] | null;
  streamingContent?: string;
  isStreaming?: boolean;
  projectName: string;
  plan?: Plan;
  className?: string;
}

/**
 * AC Viewer — dual mode:
 * - Streaming: render raw markdown via <Markdown>
 * - Done: render structured AcFeature[] with checkboxes
 */
export const AcViewer = memo(function AcViewer({
  content,
  streamingContent,
  isStreaming = false,
  projectName,
  plan = "free",
  className,
}: AcViewerProps) {
  // Streaming mode: render markdown
  if (isStreaming && streamingContent) {
    return (
      <div className={cn("h-full", className)}>
        <div className="mx-auto max-w-3xl px-6 py-8">
          <article className="prose prose-invert max-w-none">
            <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {streamingContent}
            </Markdown>
          </article>
        </div>
      </div>
    );
  }

  // Done mode: render structured AcFeature[]
  if (!content || content.length === 0) {
    return (
      <div className={cn("flex h-full items-center justify-center", className)}>
        <div className="text-center">
          <p className="text-fog">Belum ada Acceptance Criteria.</p>
          <p className="text-sm text-fog/60">AI sedang menyusun kriteria penerimaan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full", className)}>
      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-6 font-inter text-2xl font-[510] text-snow">{projectName}</h1>
        <div className="space-y-8">
          {content.map((feature, idx) => (
            <section key={idx} className="rounded-lg border border-graphite bg-obsidian p-6">
              <h2 className="mb-4 font-inter text-lg font-[510] text-snow">{feature.featureName}</h2>
              {feature.criteria.length === 0 ? (
                <p className="text-sm text-fog italic">Belum ada kriteria</p>
              ) : (
                <ul className="space-y-2">
                  {feature.criteria.map((criterion, cIdx) => (
                    <li key={cIdx} className="flex items-start gap-3 text-sm text-snow/90">
                      <Square size={16} className="mt-0.5 shrink-0 text-fog" />
                      <span>{criterion}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
});
