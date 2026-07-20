"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AcViewer } from "./ac-viewer";
import { AcToc } from "./ac-toc";
import { ChatPanel } from "@/components/chat";
import { useUIStore } from "@/store";
import { usePanelResize } from "@/hooks/use-panel-resize";
import { cn } from "@/lib/utils";
import type { AcFeature, AcVersion, Plan } from "@/types/database";
import {
  Infinity as InfinityIcon,
  FileText,
  Home,
  X,
  PanelRightClose,
  MessageSquare,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface AcDetailProps {
  projectId: string;
  projectName: string;
  latestAcVersion?: AcVersion;
  allAcVersions?: AcVersion[];
  latestPrdContent?: string;
  conversationId?: string;
  plan?: Plan;
  revisionLimit?: number;
  initialMessages?: Array<{
    id: string;
    role: string;
    content: string;
    created_at: string;
  }>;
}

export function AcDetail({
  projectId,
  projectName,
  latestAcVersion,
  allAcVersions = [],
  latestPrdContent,
  conversationId,
  plan = "free",
  revisionLimit,
  initialMessages = [],
}: AcDetailProps) {
  const router = useRouter();
  const { rightWidth, onStartDragRight, isDraggingRight } = usePanelResize();
  const showToast = useUIStore((s) => s.showToast);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>("");

  // Derive parsed features directly from props (no useEffect)
  const parsedFeatures = latestAcVersion?.content || null;

  const handleGenerate = async () => {
    if (!latestPrdContent) {
      showToast("PRD belum tersedia. Generate PRD terlebih dahulu.", "error");
      return;
    }

    setIsGenerating(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/ac/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate AC");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "delta") {
                setStreamingContent((prev) => prev + data.content);
              } else if (data.type === "done") {
                // Refresh page to get updated AC version
                router.refresh();
                showToast("Acceptance Criteria berhasil digenerate!", "success");
              } else if (data.type === "error") {
                showToast(data.error || "Gagal generate AC", "error");
              }
            } catch (e) {
              // Skip parse errors
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Generate AC error:", error);
      showToast(error.message || "Gagal generate AC", "error");
    } finally {
      setIsGenerating(false);
      setStreamingContent("");
    }
  };

  const handleStepTask = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "task" }),
      });
      if (!res.ok) throw new Error("Failed to update step");
      router.push(`/task/${projectId}`);
    } catch (err) {
      console.error("Step to task failed:", err);
      showToast("Gagal lanjut ke Task.", "error");
    }
  };

  // No PRD state
  if (!latestPrdContent) {
    return (
      <div className="flex h-dvh items-center justify-center bg-onyx text-snow">
        <div className="text-center">
          <FileText size={64} className="mx-auto mb-4 text-fog" />
          <h2 className="mb-2 text-xl font-[510]">PRD Belum Tersedia</h2>
          <p className="mb-6 text-fog">
            Generate PRD terlebih dahulu sebelum membuat Acceptance Criteria.
          </p>
          <Link
            href={`/prd/${projectId}`}
            className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2"
          >
            <ArrowRight size={16} />
            Ke PRD
          </Link>
        </div>
      </div>
    );
  }

  const isStreaming = isGenerating && streamingContent.length > 0;

  return (
    <div className="flex h-dvh overflow-hidden bg-onyx text-snow">
      {/* Left: TOC */}
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-graphite bg-obsidian md:block">
        <AcToc
          features={parsedFeatures || []}
          className="sticky top-0"
        />
      </aside>

      {/* Center: AC Viewer */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex items-center justify-between border-b border-graphite bg-obsidian px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="truncate font-inter text-lg font-[510]">{projectName}</h1>
            {revisionLimit !== undefined && (
              <span className="flex items-center gap-1 rounded bg-charcoal px-2 py-1 text-xs text-fog">
                Revisi: {allAcVersions.length > 0 ? allAcVersions.length - 1 : 0}/
                {revisionLimit === -1 ? (
                  <InfinityIcon size={12} />
                ) : (
                  revisionLimit
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={cn(
                "flex items-center gap-2 rounded px-3 py-1.5 text-sm transition-colors",
                isChatOpen
                  ? "bg-indigo text-white"
                  : "bg-charcoal text-fog hover:bg-white/5 hover:text-snow"
              )}
            >
              {isChatOpen ? (
                <PanelRightClose size={16} />
              ) : (
                <MessageSquare size={16} />
              )}
              <span className="hidden sm:inline">
                {isChatOpen ? "Tutup Chat" : "Revisi AC"}
              </span>
            </button>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 overflow-hidden">
          <AcViewer
            content={parsedFeatures}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
            projectName={projectName}
            plan={plan}
            className="h-full"
          />
        </div>

        {/* ActionBar */}
        <div className="flex items-center justify-end gap-3 border-t border-graphite bg-obsidian px-4 py-3">
          {!latestAcVersion && !isGenerating && (
            <button
              onClick={handleGenerate}
              className="btn-primary flex items-center gap-2 rounded-md px-4 py-2 text-sm font-[510]"
            >
              <Sparkles size={16} />
              Generate AC
            </button>
          )}
          {isGenerating && (
            <button
              disabled
              className="flex items-center gap-2 rounded-md bg-charcoal px-4 py-2 text-sm text-fog"
            >
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo border-t-transparent" />
              Generating...
            </button>
          )}
          {latestAcVersion && (
            <button
              onClick={handleStepTask}
              className="btn-primary flex items-center gap-2 rounded-md px-4 py-2 text-sm font-[510]"
            >
              Lanjut Generate Task
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Right: Chat Panel */}
      <div
        className={cn(
          "relative hidden shrink-0 border-l border-graphite bg-elevated transition-all duration-300 xl:block",
          !isChatOpen && "w-0 overflow-hidden border-none"
        )}
        style={{ width: isChatOpen ? `${rightWidth}px` : "0px" }}
      >
        {isChatOpen && (
          <>
            <div
              className="absolute bottom-0 left-[-4px] top-0 z-10 w-2 cursor-col-resize hover:bg-indigo/20"
              onMouseDown={onStartDragRight}
            />
            <ChatPanel
              projectId={projectId}
              conversationId={conversationId}
              className="h-full"
              acMode={true}
              currentAcContent={latestAcVersion?.content ? JSON.stringify(latestAcVersion.content) : ""}
              onStreamContent={setStreamingContent}
              inputDisabled={isGenerating}
              currentPrdContent={latestPrdContent || ""}
              userPlan={plan}
            />
          </>
        )}
      </div>

      {/* Mobile Chat Overlay */}
      <div className="xl:hidden">
        {isChatOpen && (
          <div className="fixed bottom-0 left-0 right-0 z-40 h-[60vh] rounded-t-xl bg-charcoal shadow-lg">
            <div className="flex items-center justify-between border-b border-graphite px-4 py-2">
              <span className="text-sm font-[510]">Chat</span>
              <button onClick={() => setIsChatOpen(false)} className="text-fog hover:text-snow">
                <X size={16} />
              </button>
            </div>
            <div className="h-[calc(60vh-44px)]">
              <ChatPanel
                projectId={projectId}
                conversationId={conversationId}
                className="h-full"
                acMode={true}
                currentAcContent={latestAcVersion?.content ? JSON.stringify(latestAcVersion.content) : ""}
                onStreamContent={setStreamingContent}
                inputDisabled={isGenerating}
                currentPrdContent={latestPrdContent || ""}
                userPlan={plan}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
