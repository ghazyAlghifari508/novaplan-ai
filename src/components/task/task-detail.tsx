"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WhiteboardCanvas } from "./whiteboard-canvas";
import { TabBar, type TaskTab } from "./tab-bar";
import { useUIStore } from "@/store";
import type { TaskTree } from "@/lib/services/task-service";
import { Sparkles, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

interface TaskDetailProps {
  projectId: string;
  projectName: string;
  taskTree: TaskTree | null;
  hasAc: boolean;
}

/**
 * Task detail container — orchestrates generate flow, canvas, tab bar, mobile fallback.
 * Flow Step Nav step 3 active is driven by routeToStep on /task/* (PRD-02).
 */
export function TaskDetail({ projectId, projectName, taskTree, hasAc }: TaskDetailProps) {
  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState<TaskTab>("board");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  // Generated tree from the most recent SSE done event. Falls back to the
  // server-fetched taskTree prop so router.refresh() updates flow through.
  const [generatedTree, setGeneratedTree] = useState<TaskTree | null>(null);
  // ponytail: synchronous double-click guard — state updates are async, so a
  // second click could fire two streams before isGenerating flips.
  const isGeneratingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight generation on unmount / project switch.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [projectId]);

  const handleGenerate = async () => {
    if (isGeneratingRef.current) return;
    if (!hasAc) {
      showToast("AC belum tersedia. Generate AC terlebih dahulu.", "error");
      return;
    }

    isGeneratingRef.current = true;
    setIsGenerating(true);
    setStreamingContent("");

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/task/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal generate task");
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
              setGeneratedTree(data.taskTree);
              showToast("Task tree berhasil digenerate!", "success");
            } else if (data.type === "error") {
              showToast(data.error || "Gagal generate task", "error");
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }

      // Refresh server data (project status etc.)
      router.refresh();
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // Unmount or project switch — no user-facing toast needed.
        return;
      }
      console.error("Generate task error:", error);
      showToast(error instanceof Error ? error.message : "Gagal generate task", "error");
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
      setStreamingContent("");
      abortRef.current = null;
    }
  };

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

  const currentTree = generatedTree ?? taskTree;
  const showStream = isGenerating && streamingContent.length > 0;

  return (
    <div className="flex h-dvh flex-col bg-onyx text-snow">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-graphite bg-obsidian px-4 py-3">
        <h1 className="truncate font-inter text-lg font-[510]">{projectName}</h1>
        <TabBar active={activeTab} onChange={setActiveTab} sitemapEnabled={false} />
      </div>

      {/* Canvas / generate */}
      <div className="relative flex-1 overflow-hidden">
        {currentTree || showStream ? (
          <WhiteboardCanvas
            taskTree={currentTree}
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
              Generate Task Tree
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
