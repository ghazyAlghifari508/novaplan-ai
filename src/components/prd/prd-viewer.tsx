"use client";

import { useState, memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { TableOfContents } from "./table-of-contents";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store";
import { cn } from "@/lib/utils";
import { FEATURES } from "@/types/database";
import type { Plan } from "@/types/database";

interface PrdViewerProps {
  content: string;
  projectName: string;
  className?: string;
  plan?: Plan;
}

export const PrdViewer = memo(function PrdViewer({
  content,
  projectName,
  className,
  plan = "free",
}: PrdViewerProps) {
  const [copied, setCopied] = useState(false);
  const showToast = useUIStore((s) => s.showToast);
  const features = FEATURES[plan];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    showToast("PRD disalin ke clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMd = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PRD_${projectName.replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("PRD di-download", "success");
  };

  const handleDownloadPdf = async () => {
    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title: projectName }),
      });
      if (!response.ok) throw new Error("Failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PRD_${projectName.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("PDF di-download", "success");
    } catch {
      showToast("Gagal generate PDF", "error");
    }
  };

  return (
    <div className={cn("flex h-full", className)}>
      <aside className="sticky top-0 hidden h-[calc(100vh-0px)] w-64 shrink-0 border-r border-border-subtle p-6 overflow-y-auto xl:block">
        <TableOfContents content={content} />
      </aside>

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border-subtle px-8 py-4">
          <h1 className="font-fustat text-xl font-bold">{projectName}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
            >
              {copied ? "✓ Copied" : "Copy"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadMd}
            >
              Download .md
            </Button>
            {features.downloadPdf && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadPdf}
              >
                Download .pdf
              </Button>
            )}
          </div>
        </div>

        <article className="prd-content mx-auto max-w-3xl px-8 py-8">
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
            }}
          >
            {content}
          </Markdown>
        </article>
      </div>
    </div>
  );
});
