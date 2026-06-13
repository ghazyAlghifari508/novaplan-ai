"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PrdViewer } from "./prd-viewer";
import { VersionHistory } from "./version-history";
import { ChatPanel } from "@/components/chat";
import { ProjectSidebarContent } from "./project-sidebar";
import { DeleteProjectModal } from "./delete-project-modal";
import { ProjectContextMenu } from "./project-context-menu";
import { useChatStore, useUIStore } from "@/store";
import { usePanelResize } from "@/hooks/use-panel-resize";
import { cn } from "@/lib/utils";
import type { PrdVersion, Plan } from "@/types/database";
import Link from "next/link";
import { Settings, Infinity as InfinityIcon, FileText, Home, X, PanelRightClose, MessageSquare } from "lucide-react";
import { renamePrd } from "@/app/actions/prd";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ProjectMeta {
  id: string;
  name: string;
  status: string;
  updated_at: string;
}

interface PrdDetailProps {
  projectId?: string;
  projectName?: string;
  latestVersion?: PrdVersion;
  allVersions?: PrdVersion[];
  conversationId?: string;
  isChatOpen?: boolean;
  plan?: Plan;
  revisionLimit?: number;
  projects?: ProjectMeta[];
  initialMessages?: Array<{ id: string; role: string; content: string; created_at: string }>;
  user?: any;
}

// ─────────────────────────────────────────────
// Hamburger Icon (inline SVG used 3 times)
// ─────────────────────────────────────────────

function HamburgerIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
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
  isChatOpen: initialChatOpen = true,
  plan = "free",
  revisionLimit,
  projects = [],
  initialMessages = [],
  user,
}: PrdDetailProps) {
  // ── State ──
  const [currentContent, setCurrentContent] = useState(latestVersion?.content || "");
  const [isChatOpen, setIsChatOpen] = useState(initialChatOpen);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [localProjects, setLocalProjects] = useState(projects);
  const [contextMenu, setContextMenu] = useState<{ id: string; name: string; x: number; y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // ── Hooks ──
  const { leftWidth, rightWidth, onStartDragLeft, onStartDragRight, isDraggingRight } = usePanelResize();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { isGeneratingPRD, streamingPRDContent, setGeneratingPRD, setStreamingPRDContent } = useChatStore();
  const showToast = useUIStore((s) => s.showToast);
  const { setMessages } = useChatStore();

  // ── Effects ──

  useEffect(() => { setLocalProjects(projects); }, [projects]);

  // Close context menu on any click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

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
          }))
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

  // Clear streaming state when component mounts with saved PRD
  useEffect(() => {
    if (projectId && latestVersion?.content) {
      setGeneratingPRD(false);
      setStreamingPRDContent("");
    }
  }, [projectId, latestVersion, setGeneratingPRD, setStreamingPRDContent]);

  // ── Handlers ──

  const handleVersionSelect = (content: string) => setCurrentContent(content);

  const handleProjectCreated = (newProjectId: string) => {
    startTransition(() => { router.push(`/prd/${newProjectId}`); });
  };

  const handleContextMenu = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    setContextMenu({ id, name, x: e.clientX, y: e.clientY });
  };

  const handleStartRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const handleRenameSubmit = async (e: React.FormEvent | React.FocusEvent | React.KeyboardEvent, id: string) => {
    e.preventDefault();
    if (!renameValue.trim()) { setRenamingId(null); return; }
    const fd = new FormData();
    fd.append("name", renameValue);
    await renamePrd(id, fd);
    setLocalProjects((prev) => prev.map((p) => p.id === id ? { ...p, name: renameValue } : p));
    setRenamingId(null);
  };

  const requestDeleteProject = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTargetId(id);
  };

  const handleDeleteProject = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus proyek");
      setLocalProjects((current) => current.filter((p) => p.id !== id));
      setDeleteTargetId(null);
      showToast("Proyek berhasil dihapus", "success");
      if (projectId === id) { router.push("/prd"); } else { router.refresh(); }
    } catch (error) {
      console.error("Delete error:", error);
      showToast("Gagal menghapus proyek.", "error");
    } finally {
      setIsDeletingId(null);
    }
  };

  // ── Shared sidebar props ──
  const sidebarProps = {
    projects: localProjects,
    currentProjectId: projectId,
    isDeletingId,
    renamingId,
    renameValue,
    onRenameValueChange: setRenameValue,
    onRenameSubmit: handleRenameSubmit,
    onRenameCancel: () => setRenamingId(null),
    onContextMenu: handleContextMenu,
    onDeleteRequest: requestDeleteProject,
  };

  // ── Render ──

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] overflow-hidden bg-onyx text-snow">
      {/* ═══════════ 1. Left Panel: Desktop Sidebar ═══════════ */}
      <div
        id="print-hide-sidebar"
        style={{ width: `${leftWidth}px`, background: "var(--bg-surface)" }}
        className="group/left-sidebar relative hidden shrink-0 flex-col border-r border-graphite print:hidden md:flex"
      >
        {/* Resize Handle */}
        <div
          className="absolute bottom-0 right-[-4px] top-0 z-10 w-2 cursor-col-resize transition-colors hover:bg-indigo/20"
          onMouseDown={onStartDragLeft}
        />

        <div className="flex items-center justify-between border-b border-graphite p-4">
          <span className="font-inter text-sm font-[510] text-mist">Histori PRD</span>
          <Link
            href="/"
            className="btn-primary flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-[510] transition-all duration-300 hover:brightness-105 active:scale-[0.98]"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Baru
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <ProjectSidebarContent {...sidebarProps} />
        </div>

        {/* Profile Card */}
        {user && (
          <div className="mt-auto shrink-0 border-t border-graphite p-3">
            <div className="group flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-white/5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo/15 font-[510] text-mist shadow-[inset_0_0_0_1px_rgba(94,106,210,0.35)]">
                {user.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="truncate text-sm font-[510] text-snow">
                  {user.user_metadata?.full_name || "User"}
                </span>
                <span className="truncate text-xs text-fog">
                  {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                </span>
              </div>
              <Link href="/settings" className="rounded-md p-1 text-fog opacity-0 transition-opacity hover:text-snow group-hover:opacity-100">
                <Settings size={16} />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ 1.5 Mobile Sidebar Overlay ═══════════ */}
      {isMobileSidebarOpen && (
        <div className="md:hidden print:hidden">
          <div
            className="fixed inset-0 z-40 animate-in fade-in bg-black/70 duration-200"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-3/4 max-w-sm animate-in flex-col bg-charcoal shadow-[var(--shadow-overlay)] slide-in-from-left duration-200">
            <div className="flex items-center justify-between border-b border-graphite p-4">
              <span className="font-inter text-sm font-[510]">Histori PRD</span>
              <div className="flex items-center gap-2">
                <Link href="/" className="btn-primary flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-[510] transition-all hover:brightness-105">
                  Baru
                </Link>
                <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 text-fog hover:text-snow">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <ProjectSidebarContent {...sidebarProps} onNavigate={() => setIsMobileSidebarOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ 2. Center Panel ═══════════ */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0" style={{ background: "var(--bg-page)" }}>
        {projectId && latestVersion ? (
          <>
            {/* Topbar */}
            <div id="print-hide-topbar" className="flex flex-col justify-between gap-3 border-b border-graphite px-4 py-3 print:hidden sm:flex-row sm:items-center sm:px-6">
              <div className="flex items-center gap-3">
                <button className="-ml-1.5 p-1.5 text-fog hover:text-snow md:hidden" onClick={() => setIsMobileSidebarOpen(true)}>
                  <HamburgerIcon />
                </button>
                <h1 className="max-w-[200px] truncate font-inter text-base font-[510] sm:max-w-xs sm:text-lg">{projectName}</h1>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 pb-1 sm:pb-0">
                {revisionLimit !== undefined && (
                  <span className="flex items-center gap-1 rounded-[2px] bg-charcoal px-3 py-1 text-xs font-[510] text-fog shadow-[var(--shadow-inset)]">
                    Revisi: {allVersions.length > 0 ? allVersions.length - 1 : 0}/
                    {revisionLimit === -1 ? <InfinityIcon size={12} strokeWidth={3} /> : revisionLimit}
                  </span>
                )}
                <VersionHistory
                  versions={allVersions.map((v) => ({ id: v.id, version: v.version, content: v.content, change_summary: v.change_summary, created_at: v.created_at }))}
                  currentVersion={latestVersion.version}
                  onSelectVersion={handleVersionSelect}
                  plan={plan}
                />
                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-[510] transition-colors sm:gap-2 sm:px-3",
                    isChatOpen
                      ? "btn-primary"
                      : "bg-charcoal text-fog shadow-[var(--shadow-inset)] hover:bg-white/5 hover:text-snow",
                  )}
                >
                  {isChatOpen ? <PanelRightClose size={14} className="sm:w-4 sm:h-4" /> : <MessageSquare size={14} className="sm:w-4 sm:h-4" />}
                  <span className="hidden sm:inline">{isChatOpen ? "Hide Chat" : "Chat"}</span>
                  <span className="sm:hidden">Chat</span>
                </button>
              </div>
            </div>

            <PrdViewer
              content={(isGeneratingPRD || streamingPRDContent) ? streamingPRDContent : currentContent}
              projectName={projectName || ""}
              plan={plan}
              className="flex-1 overflow-hidden"
            />
          </>
        ) : (isGeneratingPRD || streamingPRDContent) ? (
          <>
            <div className="flex items-center justify-between border-b border-graphite px-4 py-3 print:hidden sm:px-6">
              <div className="flex items-center gap-3">
                <button className="-ml-1.5 p-1.5 text-fog hover:text-snow md:hidden" onClick={() => setIsMobileSidebarOpen(true)}>
                  <HamburgerIcon />
                </button>
                <div className="flex items-center gap-2">
                  <h1 className="font-inter text-sm font-[510] sm:text-lg">
                    {isGeneratingPRD ? "NovaPlan AI Sedang Mengetik PRD..." : "Generate Terhenti (PRD Tersimpan Sebagian)"}
                  </h1>
                  {isGeneratingPRD && (
                    <span className="flex gap-1 mt-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </div>
              </div>
            </div>
            <PrdViewer content={streamingPRDContent || "Mohon tunggu sebentar..."} projectName={isGeneratingPRD ? "Menyusun PRD..." : "Gagal Generate"} plan={plan} className="flex-1 overflow-hidden" />
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
            <div className="text-center max-w-lg">
              <button className="mx-auto mb-6 flex items-center gap-2 rounded-md bg-charcoal px-4 py-2 text-sm font-[510] shadow-[var(--shadow-inset)] md:hidden" onClick={() => setIsMobileSidebarOpen(true)}>
                <HamburgerIcon size={16} />
                Buka Menu Proyek
              </button>
              <div className="mb-6 hidden justify-center text-slate sm:flex">
                <FileText size={64} strokeWidth={1} />
              </div>
              <h2 className="mb-3 font-inter text-2xl font-light">
                {localProjects.length > 0 ? "Pilih proyek" : "Belum ada proyek"}
              </h2>
              <p className="mb-6 font-inter leading-relaxed text-fog">
                {localProjects.length > 0
                  ? "Pilih salah satu proyek dari daftar di samping untuk melihat PRD-nya."
                  : "Kamu belum punya proyek. Mulai buat PRD pertamamu dari beranda."}
              </p>
              <Link href="/" className="btn-primary inline-flex items-center gap-2 rounded-md px-6 py-3 font-inter text-sm font-[510] transition-all hover:brightness-105">
                <Home size={16} />
                Mulai dari Beranda
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ 3. Right Panel: Desktop Chat ═══════════ */}
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
          <div className="absolute bottom-0 left-[-4px] top-0 z-10 w-2 cursor-col-resize transition-colors hover:bg-indigo/20" onMouseDown={onStartDragRight} />
        )}
        <div className="h-full w-full">
          <ChatPanel projectId={projectId} conversationId={conversationId} onProjectCreated={handleProjectCreated} className="w-full" inputDisabled={!projectId && !isGeneratingPRD} currentPrdContent={currentContent} />
        </div>
      </div>

      {/* ═══════════ 3.5 Mobile Chat Overlay ═══════════ */}
      <div className="xl:hidden print:hidden">
        {isChatOpen && (
          <div className="fixed bottom-0 left-0 right-0 z-40 h-[60vh] rounded-t-xl bg-charcoal shadow-[var(--shadow-overlay)]">
            <div className="flex items-center justify-between border-b border-graphite px-4 py-2">
              <span className="text-sm font-[510]">Chat</span>
              <button onClick={() => setIsChatOpen(false)} className="text-fog hover:text-snow">
                <X size={16} />
              </button>
            </div>
            <div className="h-[calc(60vh-44px)]">
              <ChatPanel projectId={projectId} conversationId={conversationId} onProjectCreated={handleProjectCreated} className="w-full border-none" enableAutoSubmit={false} inputDisabled={!projectId && !isGeneratingPRD} currentPrdContent={currentContent} />
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ Modals & Context Menu ═══════════ */}
      <DeleteProjectModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteProject}
        isDeleting={!!isDeletingId}
      />

      <ProjectContextMenu
        contextMenu={contextMenu}
        onRename={handleStartRename}
        onDelete={requestDeleteProject}
        onClose={() => setContextMenu(null)}
      />
    </div>
  );
}
