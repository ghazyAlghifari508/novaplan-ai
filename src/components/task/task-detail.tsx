"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { WhiteboardCanvas } from "./whiteboard-canvas";
import { TabBar, type TaskTab } from "./tab-bar";
import { useUIStore } from "@/store";
import type { TaskTree } from "@/lib/services/task-service";
import type { SitemapTree } from "@/lib/services/sitemap-service";
import { Sparkles, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

interface TaskDetailProps {
  projectId: string;
  projectName: string;
  taskTree: TaskTree | null;
  hasAc: boolean;
  initialSitemapTree?: SitemapTree | null;
}

type GenerateKind = "task" | "sitemap";

/**
 * Task detail container — orchestrates generate flow (task + sitemap), canvas,
 * tab bar, mobile fallback. Flow Step Nav step 3 active via routeToStep (PRD-02).
 */
export function TaskDetail({ projectId, projectName, taskTree, hasAc, initialSitemapTree = null }: TaskDetailProps) {
  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState<TaskTab>("board");
  const handleTabChange = useCallback((tab: TaskTab) => {
    // Abort any in-flight generation when switching tabs.
    abortRef.current?.abort();
    abortRef.current = null;
    setActiveTab(tab);
  }, []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingKind, setGeneratingKind] = useState<GenerateKind>("task");
  const [streamingContent, setStreamingContent] = useState("");
  const [generatedTaskTree, setGeneratedTaskTree] = useState<TaskTree | null>(null);
  const [sitemapTree, setSitemapTree] = useState<SitemapTree | null>(initialSitemapTree);
  // ponytail: synchronous double-click guard — state updates are async.
  const isGeneratingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight generation on unmount / project switch.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [projectId]);

  const streamGenerate = useCallback(
    async (kind: GenerateKind) => {
      if (isGeneratingRef.current) return;
      if (!hasAc) {
        showToast("AC belum tersedia. Generate AC terlebih dahulu.", "error");
        return;
      }

      isGeneratingRef.current = true;
      setIsGenerating(true);
      setGeneratingKind(kind);
      setStreamingContent("");

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const endpoint = kind === "task" ? "/api/task/generate" : "/api/sitemap/generate";

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Gagal generate");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "delta") {
                setStreamingContent((prev) => prev + data.content);
              } else if (data.type === "done") {
                if (kind === "task") {
                  setGeneratedTaskTree(data.taskTree);
                } else {
                  setSitemapTree(data.sitemapTree);
                }
                showToast(
                  kind === "task" ? "Task tree berhasil digenerate!" : "Sitemap berhasil digenerate!",
                  "success",
                );
              } else if (data.type === "error") {
                showToast(data.error || "Gagal generate", "error");
              }
            } catch {
              // skip malformed SSE line
            }
          }
        }

        router.refresh();
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error(`Generate ${kind} error:`, error);
        showToast(error instanceof Error ? error.message : `Gagal generate ${kind}`, "error");
      } finally {
        isGeneratingRef.current = false;
        setIsGenerating(false);
        setStreamingContent("");
        abortRef.current = null;
      }
    },
    [hasAc, projectId, router, showToast],
  );

  const handleGenerate = useCallback(() => {
    const kind: GenerateKind = activeTab === "board" ? "task" : "sitemap";
    streamGenerate(kind);
  }, [activeTab, streamGenerate]);

  // No AC state
  if (!hasAc) {
    return (
      <div className="flex h-dvh items-center justify-center bg-onyx text-snow">
        <div className="text-center">
          <FileText size={64} className="mx-auto mb-4 text-fog" />
          <h2 className="mb-2 text-xl font-[510]">AC Belum Tersedia</h2>
          <p className="mb-6 text-fog">Generate Acceptance Criteria terlebih dahulu.</p>
          <Link
            href={`/ac/${projectId}`}
            className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2"
          >
            <ArrowRight size={16} />
            Ke AC
          </Link>
        </div>
      </div>
    );
  }

  const currentTaskTree = generatedTaskTree ?? taskTree;
  const currentSitemapTree = (sitemapTree ?? initialSitemapTree) ?? null;
  const isSitemapMode = activeTab === "sitemap";
  const showStream = isGenerating && streamingContent.length > 0;

  const taskHasContent = Boolean(currentTaskTree) || (isGenerating && generatingKind === "task" && showStream);
  const sitemapHasContent = Boolean(currentSitemapTree) || (isGenerating && generatingKind === "sitemap" && showStream);
  const hasContentForActiveTab = isSitemapMode ? sitemapHasContent : taskHasContent;

  return (
    <div className="flex h-dvh flex-col bg-onyx text-snow">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-graphite bg-obsidian px-4 py-3">
        <h1 className="truncate font-inter text-lg font-[510]">{projectName}</h1>
        <TabBar active={activeTab} onChange={handleTabChange} sitemapEnabled />
      </div>

      {/* Canvas / generate */}
      <div className="relative flex-1 overflow-hidden">
        {hasContentForActiveTab ? (
          <WhiteboardCanvas
            mode={isSitemapMode ? "sitemap" : "task"}
            taskTree={isSitemapMode ? null : currentTaskTree}
            sitemapTree={isSitemapMode ? currentSitemapTree : null}
            isStreaming={isGenerating}
            streamingContent={streamingContent}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn-primary flex items-center gap-2 rounded-md px-6 py-3 font-[510] disabled:opacity-40"
            >
              <Sparkles size={18} />
              {isSitemapMode ? "Generate Sitemap" : "Generate Task Tree"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
