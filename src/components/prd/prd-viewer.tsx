"use client";

import { useState, useRef, useEffect, memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { TableOfContents } from "./table-of-contents";
import { Mermaid } from "./mermaid";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store";
import { cn } from "@/lib/utils";
import { FEATURES } from "@/types/database";
import type { Plan } from "@/types/database";
import { Check, Copy, Download } from "lucide-react";

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


  // Membersihkan sisa tag markdown (misal ```markdown di awal dan ``` di akhir)
  // yang sering kali ditambahkan secara otomatis oleh AI
  const getCleanContent = () => {
    let cleaned = content.replace(/<!--[\s\S]*?-->/g, "").trim();
    
    // Cari blok markdown pembungkus (contoh: AI menyelipkan "Berikut PRD-nya:\n```markdown\n...```")
    const startMatch = cleaned.match(/```(?:markdown|md)\s*\n/i);
    
    if (startMatch) {
      // Jika ```markdown ditemukan di bagian awal dokumen (<500 chars), anggap ini wrapper utama
      if (startMatch.index !== undefined && startMatch.index < 500) {
        const startIndex = startMatch.index + startMatch[0].length;
        const lastIndex = cleaned.lastIndexOf("```");
        
        // Pastikan ``` penutup ada dan posisinya setelah pembuka
        if (lastIndex > startIndex) {
          cleaned = cleaned.substring(startIndex, lastIndex);
        } else {
          cleaned = cleaned.substring(startIndex);
        }
      }
    } else {
      // Jika tidak ada language tag tapi diawali ```
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
  };

  return (
    <div className={cn("flex h-full", className)}>
      <aside
        className="hidden h-full w-64 shrink-0 border-r border-[var(--border-subtle)] p-6 overflow-y-auto xl:block"
        style={{ background: "var(--bg-page)" }}
      >
        <TableOfContents content={content} />
      </aside>

      <div ref={scrollRef} className="flex-1 overflow-y-auto relative scroll-smooth">
        <div
          id="print-hide-viewer-topbar"
          className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border-subtle)] px-8 py-4 print:hidden"
          style={{ background: "var(--bg-page)" }}
        >
          <h1 className="font-fustat text-xl font-bold">{projectName}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadMd}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={16} /> Download .md
            </Button>

          </div>
        </div>

        <article className="prd-content mx-auto max-w-3xl px-8 pt-8 pb-16">
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
            {getCleanContent()}
          </Markdown>
        </article>
      </div>
    </div>
  );
});
