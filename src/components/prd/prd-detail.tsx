"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PrdViewer } from "./prd-viewer";
import { VersionHistory } from "./version-history";
import { ChatPanel } from "@/components/chat";
import { useChatStore, useUIStore } from "@/store";
import { usePanelResize } from "@/hooks/use-panel-resize";
import { cn } from "@/lib/utils";
import type { PrdVersion, Plan } from "@/types/database";
import Link from "next/link";
import {
  Infinity as InfinityIcon,
  FileText,
  Home,
  X,
  PanelRightClose,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

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
  const [isChatOpen, setIsChatOpen] = useState(initialChatOpen);
  const [isStepLoading, setIsStepLoading] = useState(false);

  // ── Hooks ──
  const { rightWidth, onStartDragRight, isDraggingRight } = usePanelResize();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { isGeneratingPRD, streamingPRDContent, setGeneratingPRD, setStreamingPRDContent, setMessages } =
    useChatStore();
  const showToast = useUIStore((s) => s.showToast);

  // ── Effects ──

  // Sync chat messages when switching projects
  useEffect(() => {
    const store = useChatStore.getState();
    if (store.activeProjectId !== (projectId || null)) {
      store.setActiveProject(projectId || null);
      if (initialMessages && initialMessages.length > 0) {
        setMessages(
          initialMessages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
            timestamp: new Date(m.created_at).getTime(),
          })),
        );
      } else {
        setMessages([]);
      }
    }
  }, [projectId, initialMessages, setMessages]);

  // Sync content when latestVersion updates
  useEffect(() => {
    if (latestVersion) setCurrentContent(latestVersion.content);
  }, [latestVersion]);

  // Clear streaming state when mounted with saved PRD, and when the index
  // page (no projectId) is visited so stale Zustand globals from a prior
  // streaming session don't render a false "Mengetik PRD..." state.
  useEffect(() => {
    if (projectId && latestVersion?.content) {
      setGeneratingPRD(false);
      setStreamingPRDContent("");
    } else if (!projectId) {
      setGeneratingPRD(false);
      setStreamingPRDContent("");
    }
  }, [projectId, latestVersion, setGeneratingPRD, setStreamingPRDContent]);

  // ── Handlers ──

  const handleVersionSelect = (content: string) => setCurrentContent(content);

  const handleProjectCreated = (newProjectId: string) => {
    startTransition(() => {
      router.push(`/prd/${newProjectId}`);
    });
  };

  const handleToggleChat = () => setIsChatOpen((prev) => !prev);

  // ponytail: skip explicit chat input focus — ChatPanel has no focus API yet.
  // Add when user complains; panel open + visible input is enough.
  const handleRevisiPrd = () => setIsChatOpen(true);

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
    <div className="flex h-dvh overflow-hidden bg-onyx text-snow">
      {/* ═══════════ Center Panel ═══════════ */}
      <div
        className="flex flex-1 flex-col overflow-hidden min-w-0"
        style={{ background: "var(--bg-page)" }}
      >
        {projectId && latestVersion ? (
          <>
            {/* Topbar */}
            <div
              id="print-hide-topbar"
              className="flex flex-col justify-between gap-3 border-b border-graphite px-4 py-3 print:hidden sm:flex-row sm:items-center sm:px-6"
            >
              <div className="flex items-center gap-3">
                <h1 className="max-w-[200px] truncate font-inter text-base font-[510] sm:max-w-xs sm:text-lg">
                  {projectName}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 pb-1 sm:pb-0">
                {revisionLimit !== undefined && (
                  <span className="flex items-center gap-1 rounded-[2px] bg-charcoal px-3 py-1 text-xs font-[510] text-fog shadow-[var(--shadow-inset)]">
                    Revisi: {allVersions.length > 0 ? allVersions.length - 1 : 0}/
                    {revisionLimit === -1 ? (
                      <InfinityIcon size={12} strokeWidth={3} />
                    ) : (
                      revisionLimit
                    )}
                  </span>
                )}
                <VersionHistory
                  versions={allVersions.map((v) => ({
                    id: v.id,
                    version: v.version,
                    content: v.content,
                    change_summary: v.change_summary,
                    created_at: v.created_at,
                  }))}
                  currentVersion={latestVersion.version}
                  onSelectVersion={handleVersionSelect}
                  plan={plan}
                />
                <button
                  onClick={handleToggleChat}
                  aria-expanded={isChatOpen}
                  aria-label={isChatOpen ? "Tutup chat" : "Buka chat"}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-[510] transition-colors sm:gap-2 sm:px-3",
                    isChatOpen
                      ? "btn-primary"
                      : "bg-charcoal text-fog shadow-[var(--shadow-inset)] hover:bg-white/5 hover:text-snow",
                  )}
                >
                  {isChatOpen ? (
                    <PanelRightClose size={14} className="sm:w-4 sm:h-4" />
                  ) : (
                    <MessageSquare size={14} className="sm:w-4 sm:h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isChatOpen ? "Hide Chat" : "Chat"}
                  </span>
                  <span className="sm:hidden">Chat</span>
                </button>
              </div>
            </div>

            <PrdViewer
              content={isGeneratingPRD || streamingPRDContent ? streamingPRDContent : currentContent}
              projectName={projectName || ""}
              plan={plan}
              className="flex-1 overflow-hidden"
            />

            {/* ActionBar — sticky bottom of PRD area */}
            <div
              id="print-hide-actions"
              className="flex shrink-0 items-center justify-end gap-3 border-t border-graphite bg-onyx px-4 py-3 print:hidden sm:px-6"
              style={{ background: "var(--bg-page)" }}
            >
              <button
                onClick={handleRevisiPrd}
                className="flex items-center gap-2 rounded-md bg-charcoal px-4 py-2 text-sm font-[510] text-fog shadow-[var(--shadow-inset)] transition-colors hover:bg-white/5 hover:text-snow"
              >
                <MessageSquare size={14} />
                Revisi PRD Dulu
              </button>
              <button
                onClick={handleStepAc}
                disabled={isStepLoading || isGeneratingPRD}
                className="btn-primary flex items-center gap-2 rounded-md px-4 py-2 text-sm font-[510] transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-40 disabled:hover:brightness-100"
              >
                {isStepLoading ? (
                  "Memuat..."
                ) : (
                  <>
                    Lanjut Bikin AC
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </>
        ) : (isGeneratingPRD || streamingPRDContent) ? (
          <>
            <div className="flex items-center justify-between border-b border-graphite px-4 py-3 print:hidden sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <h1 className="font-inter text-sm font-[510] sm:text-lg">
                    {isGeneratingPRD
                      ? "NovaPlan AI Sedang Mengetik PRD..."
                      : "Generate Terhenti (PRD Tersimpan Sebagian)"}
                  </h1>
                  {isGeneratingPRD && (
                    <span className="flex gap-1 mt-1">
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald"
                        style={{ animationDelay: "300ms" }}
                      />
                    </span>
                  )}
                </div>
              </div>
            </div>
            <PrdViewer
              content={streamingPRDContent || "Mohon tunggu sebentar..."}
              projectName={isGeneratingPRD ? "Menyusun PRD..." : "Gagal Generate"}
              plan={plan}
              className="flex-1 overflow-hidden"
            />
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
            <div className="text-center max-w-lg">
              <div className="mb-6 hidden justify-center text-slate sm:flex">
                <FileText size={64} strokeWidth={1} />
              </div>
              <h2 className="mb-3 font-inter text-2xl font-light">Belum ada proyek</h2>
              <p className="mb-6 font-inter leading-relaxed text-fog">
                Kamu belum punya proyek. Mulai buat PRD pertamamu dari beranda.
              </p>
              <Link
                href="/"
                className="btn-primary inline-flex items-center gap-2 rounded-md px-6 py-3 font-inter text-sm font-[510] transition-all hover:brightness-105"
              >
                <Home size={16} />
                Mulai dari Beranda
              </Link>
            </div>
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
        <div className="h-full w-full">
          <ChatPanel
            projectId={projectId}
            conversationId={conversationId}
            onProjectCreated={handleProjectCreated}
            className="w-full"
            inputDisabled={!projectId && !isGeneratingPRD}
            currentPrdContent={currentContent}
            userPlan={plan}
          />
        </div>
      </div>

      {/* ═══════════ Mobile Chat Overlay ═══════════ */}
      <div className="xl:hidden print:hidden">
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
                onClick={() => setIsChatOpen(false)}
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
                className="w-full border-none"
                enableAutoSubmit={false}
                inputDisabled={!projectId && !isGeneratingPRD}
                currentPrdContent={currentContent}
                userPlan={plan}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
