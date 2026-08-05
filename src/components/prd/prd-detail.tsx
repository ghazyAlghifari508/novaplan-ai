"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PrdViewer } from "./prd-viewer";
import { ChatPanel } from "@/components/chat";
import { ModelDropdown } from "@/components/chat/model-dropdown";
import { useChatStore, useUIStore } from "@/store";
import { usePanelResize } from "@/hooks/use-panel-resize";
import { cn } from "@/lib/utils";
import type { PrdVersion, Plan } from "@/types/database";
import Link from "next/link";
import {
  Home,
  X,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { DEFAULT_MODEL_ID } from "@/lib/model-config";
import { savePendingPrdPrompt } from "@/lib/prompt-handoff";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface PrdDetailProps {
  projectId?: string;
  projectName?: string;
  latestVersion?: PrdVersion;
  allVersions?: PrdVersion[];
  conversationId?: string;
  isChatOpen?: boolean;
  plan?: Plan;
  revisionLimit?: number;
  initialMessages?: Array<{
    id: string;
    role: string;
    content: string;
    created_at: string;
  }>;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function PrdDetail({
  projectId,
  projectName,
  latestVersion,
  allVersions = [],
  conversationId,
  isChatOpen: initialChatOpen = false,
  plan = "free",
  revisionLimit,
  initialMessages = [],
}: PrdDetailProps) {
  // ── State ──
  const [currentContent, setCurrentContent] = useState(latestVersion?.content || "");
  const [selectedVersionNum, setSelectedVersionNum] = useState(latestVersion?.version || 1);
  const [activeTab, setActiveTab] = useState<"doc" | "chat">("doc");
  // ponytail: versions list must be client-refreshable after revision - server-rendered
  // allVersions stays stale until next page load. Track locally so version history
  // appears immediately after revision without requiring a full page refresh.
  const [versions, setVersions] = useState(allVersions);
  const isChatOpen = useUIStore((s) => s.isChatPanelOpen);
  const [isStepLoading, setIsStepLoading] = useState(false);
  // Error/retry state for failed or partial generation
  const [errorRetryModel, setErrorRetryModel] = useState(DEFAULT_MODEL_ID);
  // ponytail: on first paint for a fresh project, isGeneratingPRD hasn't been
  // set yet (ChatPanel's auto-submit effect sets it, but effects run after
  // paint) - without this flag the error branch below flashes before the
  // stream even starts. Resolves false once child effects have run.
  const [isCheckingGeneration, setIsCheckingGeneration] = useState(
    () => !!projectId && !latestVersion,
  );

  // ── Hooks ──
  const { rightWidth, onStartDragRight, isDraggingRight } = usePanelResize();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { isGeneratingPRD, streamingPRDContent, setGeneratingPRD, setStreamingPRDContent, setMessages } =
    useChatStore();
  const showToast = useUIStore((s) => s.showToast);

  // ── Effects ──

  // Sync chat messages - always set messages when initialMessages change
  // (survives refresh by loading from DB server-side).
  useEffect(() => {
    const store = useChatStore.getState();
    const isDifferentProject = store.activeProjectId !== (projectId || null);
    if (isDifferentProject) {
      store.setActiveProject(projectId || null);
    }
    if (initialMessages && initialMessages.length > 0) {
      setMessages(
        initialMessages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
          timestamp: new Date(m.created_at).getTime(),
        })),
      );
    } else if (isDifferentProject) {
      setMessages([]);
    }
  }, [projectId, initialMessages, setMessages]);

  // Sync content when latestVersion updates
  useEffect(() => {
    if (latestVersion) setCurrentContent(latestVersion.content);
  }, [latestVersion]);

  // Runs after ChatPanel's child auto-submit effect (children mount before
  // parents), so by here isGeneratingPRD is already true if a stream started.
  useEffect(() => {
    setIsCheckingGeneration(false);
  }, []);

  // Clear streaming state when mounted with saved PRD, and when navigating
  // between projects so stale Zustand globals from a prior streaming session
  // don't render a false generation state.
  useEffect(() => {
    const store = useChatStore.getState();
    const isDifferentProject = projectId && store.activeProjectId !== projectId;
    if (projectId && (latestVersion?.content || isDifferentProject)) {
      setGeneratingPRD(false);
      setStreamingPRDContent("");
    } else if (!projectId) {
      setGeneratingPRD(false);
      setStreamingPRDContent("");
    }
  }, [projectId, latestVersion, setGeneratingPRD, setStreamingPRDContent]);

  // ── Handlers ──

  // ponytail: re-fetch versions list client-side so version history updates
  // immediately after revision without full page refresh
  const refreshVersions = useCallback(async (): Promise<PrdVersion[]> => {
    if (!projectId) return [];
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
        return data;
      }
    } catch (err) {
      console.error("Failed to refresh versions:", err);
    }
    return [];
  }, [projectId]);

  const handleVersionSelect = (content: string, version: number) => {
    setCurrentContent(content);
    setSelectedVersionNum(version);
  };

  // ponytail: after revision completes, update content, refresh versions list,
  // and jump selectedVersionNum to the new version - otherwise the Version
  // History label stays pinned to whatever version was current on page load.
  const handlePrdRevised = useCallback(
    async (content: string) => {
      setCurrentContent(content);
      const refreshed = await refreshVersions();
      if (refreshed.length > 0) {
        setSelectedVersionNum(Math.max(...refreshed.map((v) => v.version)));
      }
    },
    [refreshVersions]
  );

  const handleProjectCreated = (newProjectId: string) => {
    startTransition(() => {
      router.push(`/prd/${newProjectId}`);
    });
  };

  const toggleChat = useUIStore((s) => s.toggleChatPanel);

  /**
   * Retry generating PRD from error state.
   * Creates a fresh project via the normal flow so ChatPanel auto-submit works.
   */
  const handleRetryGenerate = useCallback(async () => {
    sessionStorage.setItem("novaplan:selected-model", errorRetryModel);
    setGeneratingPRD(false);
    setStreamingPRDContent("");

    // Save as pending prompt so ChatPanel's auto-submit effect picks it up directly
    savePendingPrdPrompt(projectName || "Project Baru", "auto", projectName);

    startTransition(() => {
      router.push(`/prd/${projectId}`);
    });
  }, [projectName, projectId, errorRetryModel, setGeneratingPRD, setStreamingPRDContent, router]);

  const handleStepAc = async () => {
    if (!projectId || isStepLoading) return;
    setIsStepLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "ac" }),
      });
      if (!res.ok) throw new Error("Gagal memperbarui tahap proyek");
      startTransition(() => {
        router.push(`/ac/${projectId}`);
      });
    } catch (err) {
      console.error("Step to AC failed:", err);
      showToast("Gagal lanjut ke Acceptance Criteria.", "error");
    } finally {
      setIsStepLoading(false);
    }
  };

  // ── Render ──

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-onyx text-snow">
      {/* ═══════════ Mobile Tab Toggle (<md) ═══════════ */}
      <div className="flex shrink-0 border-b border-graphite bg-charcoal md:hidden">
        <button
          onClick={() => setActiveTab("doc")}
          className={cn(
            "flex-1 py-2.5 text-center text-sm font-[510] transition-colors border-b-2",
            activeTab === "doc"
              ? "border-indigo text-snow bg-white/5"
              : "border-transparent text-fog hover:text-snow"
          )}
        >
          Dokumen
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={cn(
            "flex-1 py-2.5 text-center text-sm font-[510] transition-colors border-b-2",
            activeTab === "chat"
              ? "border-indigo text-snow bg-white/5"
              : "border-transparent text-fog hover:text-snow"
          )}
        >
          Chat
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ═══════════ Center Panel (Document View) ═══════════ */}
        <div
          className={cn(
            "flex flex-1 flex-col overflow-hidden min-w-0",
            activeTab !== "doc" && "hidden md:flex"
          )}
          style={{ background: "var(--bg-page)" }}
        >
        {projectId && !isCheckingGeneration && !isGeneratingPRD && !streamingPRDContent && !latestVersion ? (
          /* Error/Retry state - project exists but has no PRD version */
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
            <div className="text-center max-w-lg">
              <div className="mb-6 flex justify-center text-crimson">
                <AlertCircle size={48} strokeWidth={1.5} />
              </div>
              <h2 className="mb-3 font-inter text-2xl font-light">PRD Gagal Dibuat</h2>
              <p className="mb-6 font-inter leading-relaxed text-fog">
                Gangguan pada model AI atau proses generasi terputus. Silakan pilih model dan coba lagi.
              </p>

              <div className="mx-auto mb-6 flex max-w-xs flex-col gap-3 rounded-lg border border-indigo/20 bg-indigo/5 p-4">
                <label className="font-inter text-sm font-[510] text-mist text-left">
                  Pilih Model AI
                </label>
                <div className="flex w-full items-center rounded-md bg-charcoal p-2 shadow-[var(--shadow-inset)]">
                  <ModelDropdown
                    selectedModel={errorRetryModel}
                    onSelect={setErrorRetryModel}
                    userPlan={plan}
                    position="bottom"
                  />
                </div>
                <button
                  onClick={handleRetryGenerate}
                  className="btn-primary flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-[510]"
                >
                  <RefreshCw size={14} />
                  Generate Ulang PRD
                </button>
              </div>

              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 rounded-md bg-charcoal px-6 py-3 text-sm font-[510] text-fog shadow-[var(--shadow-inset)] transition-colors hover:bg-white/5 hover:text-snow"
              >
                <Home size={16} />
                Kembali ke Beranda
              </button>
            </div>
          </div>
        ) : (
          /* Default: PRD content (streaming or saved) */
          <div className="flex flex-1 flex-col overflow-hidden">
            {isGeneratingPRD && !streamingPRDContent && !latestVersion ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo border-t-transparent" />
                <p className="mt-4 text-sm font-[510] text-snow">Sedang membuat PRD...</p>
                <p className="mt-1 text-xs text-fog">Model AI sedang menganalisis jawaban Anda</p>
              </div>
            ) : (
              <PrdViewer
                content={isGeneratingPRD || streamingPRDContent ? streamingPRDContent : currentContent}
              projectName={projectName || ""}
              plan={plan}
              versions={versions?.map((v) => ({
                id: v.id,
                version: v.version,
                content: v.content,
                change_summary: v.change_summary,
                created_at: v.created_at,
              }))}
              currentVersion={selectedVersionNum}
              onSelectVersion={handleVersionSelect}
              className="flex-1 overflow-hidden"
            />
            )}
          </div>
        )}
      </div>

      {/* ═══════════ Right Panel: Desktop Chat ═══════════ */}
      <div
        id="print-hide-chat"
        style={{ width: isChatOpen ? `${rightWidth}px` : "0px", background: "var(--bg-elevated)" }}
        className={cn(
          "group/right-sidebar relative hidden shrink-0 border-l border-graphite print:hidden xl:block",
          !isDraggingRight && "transition-all duration-300",
          !isChatOpen && "overflow-hidden border-none",
        )}
      >
        {isChatOpen && (
          <div
            className="absolute bottom-0 left-[-4px] top-0 z-10 w-2 cursor-col-resize transition-colors hover:bg-indigo/20"
            onMouseDown={onStartDragRight}
          />
        )}
        <div className="h-full w-full" style={{ display: isChatOpen ? 'block' : 'none' }}>
          <ChatPanel
            projectId={projectId}
            conversationId={conversationId}
            onProjectCreated={handleProjectCreated}
            onPrdRevised={handlePrdRevised}
            className="w-full"
            inputDisabled={!projectId && !isGeneratingPRD}
            currentPrdContent={currentContent}
            userPlan={plan}
            selectedVersionNum={selectedVersionNum}
          />
        </div>
      </div>

      {/* ═══════════ Mobile Chat View (<md) & Drawer (md to xl) ═══════════ */}
      {/* 1. Full panel for Mobile View tab toggle (<md) */}
      <div className={cn("flex-1 overflow-hidden md:hidden", activeTab !== "chat" && "hidden")}>
        <ChatPanel
          projectId={projectId}
          conversationId={conversationId}
          onProjectCreated={handleProjectCreated}
          onPrdRevised={handlePrdRevised}
          className="h-full w-full border-none"
          enableAutoSubmit={false}
          inputDisabled={!projectId && !isGeneratingPRD}
          currentPrdContent={currentContent}
          userPlan={plan}
          selectedVersionNum={selectedVersionNum}
        />
      </div>

      {/* 2. Slide-over drawer for tablet screens (md to xl) */}
      <div className="hidden md:block xl:hidden print:hidden">
        {isChatOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Panel chat revisi"
            className="fixed bottom-0 left-0 right-0 z-40 h-[60vh] rounded-t-xl bg-charcoal shadow-[var(--shadow-overlay)]"
          >
            <div className="flex items-center justify-between border-b border-graphite px-4 py-2">
              <span className="text-sm font-[510]">Chat</span>
              <button
                onClick={toggleChat}
                aria-label="Tutup chat"
                className="text-fog hover:text-snow"
              >
                <X size={16} />
              </button>
            </div>
            <div className="h-[calc(60vh-44px)]">
              <ChatPanel
                projectId={projectId}
                conversationId={conversationId}
                onProjectCreated={handleProjectCreated}
                onPrdRevised={handlePrdRevised}
                className="w-full border-none"
                enableAutoSubmit={false}
                inputDisabled={!projectId && !isGeneratingPRD}
                currentPrdContent={currentContent}
                userPlan={plan}
                selectedVersionNum={selectedVersionNum}
              />
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
