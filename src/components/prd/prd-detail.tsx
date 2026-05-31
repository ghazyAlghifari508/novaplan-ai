"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PrdViewer } from "./prd-viewer";
import { VersionHistory } from "./version-history";
import { ChatPanel } from "@/components/chat";
import { useChatStore, useUIStore } from "@/store";
import { cn } from "@/lib/utils";
import type { PrdVersion, Plan } from "@/types/database";
import Link from "next/link";
import { Infinity as InfinityIcon, FileText, Home, X, Trash2, PanelRightClose, MessageSquare } from "lucide-react";
import { renamePrd, duplicatePrd } from "@/app/actions/prd";

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
  const [currentContent, setCurrentContent] = useState(latestVersion?.content || "");
  const [isChatOpen, setIsChatOpen] = useState(initialChatOpen);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [localProjects, setLocalProjects] = useState(projects);

  const [contextMenu, setContextMenu] = useState<{ id: string, name: string, x: number, y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    setContextMenu({ id, name, x: e.clientX, y: e.clientY });
  };

  const handleRenameSubmit = async (e: React.FormEvent | React.FocusEvent | React.KeyboardEvent, id: string) => {
    e.preventDefault();
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    const fd = new FormData();
    fd.append("name", renameValue);
    await renamePrd(id, fd);
    
    setLocalProjects((prev) => prev.map((p) => p.id === id ? { ...p, name: renameValue } : p));
    setRenamingId(null);
  };

  // Resize state
  const [leftWidth, setLeftWidth] = useState(256); // w-64 = 256px
  const [rightWidth, setRightWidth] = useState(380);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    isGeneratingPRD,
    streamingPRDContent,
    setGeneratingPRD,
    setStreamingPRDContent,
  } = useChatStore();
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  const { setMessages } = useChatStore();

  useEffect(() => {
    const store = useChatStore.getState();
    // Only update messages if we are switching to a different project
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
        setMessages([]); // Clear chat when there are no initial messages (like clicking "Baru")
      }
    }
  }, [projectId, initialMessages, setMessages]);

  // If latestVersion updates, update content
  useEffect(() => {
    if (latestVersion) {
      setCurrentContent(latestVersion.content);
    }
  }, [latestVersion]);

  // When this component loads with a real projectId + saved PRD version,
  // clear any lingering streaming state from the generation phase.
  useEffect(() => {
    if (projectId && latestVersion?.content) {
      setGeneratingPRD(false);
      setStreamingPRDContent("");
    }
  }, [projectId, latestVersion, setGeneratingPRD, setStreamingPRDContent]);


  // Handle resizing logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft) {
        setLeftWidth(Math.max(160, Math.min(e.clientX, 600)));
      } else if (isDraggingRight) {
        setRightWidth(Math.max(280, Math.min(window.innerWidth - e.clientX, 800)));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
    } else {
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };
  }, [isDraggingLeft, isDraggingRight]);

  const handleVersionSelect = (content: string) => {
    setCurrentContent(content);
  };

  const handleProjectCreated = (newProjectId: string) => {
    startTransition(() => {
      router.push(`/prd/${newProjectId}`);
    });
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

      if (projectId === id) {
        router.push("/prd");
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Delete error:", error);
      showToast("Gagal menghapus proyek.", "error");
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* 1. Left Panel: Project History Sidebar (Desktop) */}
      <div
        id="print-hide-sidebar"
        style={{ width: `${leftWidth}px`, background: "var(--bg-surface)" }}
        className="shrink-0 border-r border-[var(--border-subtle)] flex-col relative group/left-sidebar print:hidden hidden md:flex"
      >
        {/* Resize Handle */}
        <div
          className="absolute right-[-4px] top-0 bottom-0 w-2 cursor-col-resize hover:bg-[var(--btn-bg)]/20 z-10 transition-colors"
          onMouseDown={() => setIsDraggingLeft(true)}
        />

        <div className="p-4 border-b border-border-subtle dark:border-white/10 flex items-center justify-between">
          <span className="font-schibsted font-semibold text-sm">Histori PRD</span>
          <Link
            href="/"
            className="flex h-8 items-center gap-1.5 rounded-lg btn-primary px-3 text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2V14M2 8H14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Baru
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {localProjects.length === 0 ? (
            <div className="p-4 text-center text-xs text-text-gray dark:text-[#A0A0A0]">
              Belum ada proyek.
            </div>
          ) : (
            localProjects.map((p) => (
              <div
                key={p.id}
                onContextMenu={(e) => handleContextMenu(e, p.id, p.name)}
                className={cn(
                  "group flex items-center justify-between w-full rounded-lg transition-colors relative",
                  projectId === p.id
                    ? "bg-black/5 font-medium text-primary-black dark:text-[#F0F0F0]"
                    : "text-text-gray dark:text-[#A0A0A0] hover:bg-black/5 hover:text-primary-black dark:text-[#F0F0F0]",
                )}
              >
                {renamingId === p.id ? (
                  <form onSubmit={(e) => handleRenameSubmit(e, p.id)} className="flex-1 px-2 py-1.5 flex items-center">
                    <input
                      autoFocus
                      className="w-full text-sm font-schibsted bg-white dark:bg-[#2A2A2A] border border-blue-500 rounded px-2 py-1 focus:outline-none"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                           e.preventDefault();
                           await handleRenameSubmit(e, p.id);
                        } else if (e.key === "Escape") {
                           setRenamingId(null);
                        }
                      }}
                      onBlur={(e) => handleRenameSubmit(e, p.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </form>
                ) : (
                  <>
                    <Link
                      href={`/prd/${p.id}`}
                      className="flex-1 block px-3 py-2.5 text-sm truncate font-schibsted"
                    >
                      {p.name}
                    </Link>
                    <button
                      onClick={(e) => requestDeleteProject(e, p.id)}
                      disabled={isDeletingId === p.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 mr-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-md disabled:opacity-50 flex-shrink-0"
                      title="Hapus proyek"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Profile Card (Claude-style) */}
        {user && (
          <div className="mt-auto p-3 border-t border-border-subtle dark:border-white/10 shrink-0">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
                {user.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium text-primary-black dark:text-[#F0F0F0] truncate">
                  {user.user_metadata?.full_name || 'User'}
                </span>
                <span className="text-xs text-text-gray dark:text-[#A0A0A0] truncate">
                  {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                </span>
              </div>
              <Link href="/settings" className="p-1 rounded-md text-text-gray dark:text-[#A0A0A0] hover:text-primary-black dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 1.5 Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="md:hidden print:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div
            className="fixed inset-y-0 left-0 z-50 w-3/4 max-w-sm bg-white dark:bg-[#1E1E1E] shadow-xl flex flex-col animate-in slide-in-from-left duration-200"
          >
            <div className="p-4 border-b border-border-subtle dark:border-white/10 flex items-center justify-between">
              <span className="font-schibsted font-semibold text-sm">Histori PRD</span>
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="flex h-8 items-center gap-1.5 rounded-lg btn-primary px-3 text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Baru
                </Link>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-2 text-text-gray dark:text-[#A0A0A0] hover:text-primary-black dark:hover:text-[#F0F0F0]"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {localProjects.length === 0 ? (
                <div className="p-4 text-center text-xs text-text-gray dark:text-[#A0A0A0]">
                  Belum ada proyek.
                </div>
              ) : (
                localProjects.map((p) => (
                  <div
                    key={p.id}
                    onContextMenu={(e) => handleContextMenu(e, p.id, p.name)}
                    className={cn(
                      "group flex items-center justify-between w-full rounded-lg transition-colors relative",
                      projectId === p.id
                        ? "bg-black/5 font-medium text-primary-black dark:text-[#F0F0F0]"
                        : "text-text-gray dark:text-[#A0A0A0] hover:bg-black/5 hover:text-primary-black dark:text-[#F0F0F0]",
                    )}
                  >
                    {renamingId === p.id ? (
                      <form onSubmit={(e) => handleRenameSubmit(e, p.id)} className="flex-1 px-2 py-1.5 flex items-center">
                        <input
                          autoFocus
                          className="w-full text-sm font-schibsted bg-white dark:bg-[#2A2A2A] border border-blue-500 rounded px-2 py-1 focus:outline-none"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                               e.preventDefault();
                               await handleRenameSubmit(e, p.id);
                            } else if (e.key === "Escape") {
                               setRenamingId(null);
                            }
                          }}
                          onBlur={(e) => handleRenameSubmit(e, p.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </form>
                    ) : (
                      <>
                        <Link
                          href={`/prd/${p.id}`}
                          onClick={() => setIsMobileSidebarOpen(false)}
                          className="flex-1 block px-3 py-2.5 text-sm truncate font-schibsted"
                        >
                          {p.name}
                        </Link>
                        <button
                          onClick={(e) => requestDeleteProject(e, p.id)}
                          disabled={isDeletingId === p.id}
                          className="p-1.5 mr-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-md disabled:opacity-50 flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Center Panel: PRD Viewer or Empty State */}
      <div
        className="flex flex-1 flex-col overflow-hidden min-w-0"
        style={{ background: "var(--bg-page)" }}
      >
        {projectId && latestVersion ? (
          <>
            <div id="print-hide-topbar" className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-subtle)] px-4 sm:px-6 py-3 print:hidden gap-3">
              <div className="flex items-center gap-3">
                <button
                  className="md:hidden p-1.5 -ml-1.5 text-text-gray hover:text-primary-black dark:text-[#A0A0A0] dark:hover:text-[#F0F0F0]"
                  onClick={() => setIsMobileSidebarOpen(true)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                </button>
                <h1 className="font-fustat text-base sm:text-lg font-bold truncate max-w-[200px] sm:max-w-xs">{projectName}</h1>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                {revisionLimit !== undefined && (
                  <span className="flex items-center gap-1 rounded-full bg-light-gray-bg dark:bg-[#161616] px-3 py-1 text-xs font-medium text-text-gray dark:text-[#A0A0A0]">
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
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors",
                    isChatOpen
                      ? "btn-primary"
                      : "bg-light-gray-bg dark:bg-[#161616] text-text-gray dark:text-[#A0A0A0] hover:bg-black/5 dark:hover:bg-white/10 hover:text-primary-black dark:hover:text-[#F0F0F0]",
                  )}
                >
                  {isChatOpen ? <PanelRightClose size={14} className="sm:w-4 sm:h-4" /> : <MessageSquare size={14} className="sm:w-4 sm:h-4" />}
                  <span className="hidden sm:inline">{isChatOpen ? "Hide Chat" : "Chat"}</span>
                  <span className="sm:hidden">Chat</span>
                </button>
              </div>
            </div>

            <PrdViewer
              content={
                isGeneratingPRD && streamingPRDContent
                  ? streamingPRDContent
                  : currentContent
              }
              projectName={projectName || ""}
              plan={plan}
              className="flex-1 overflow-hidden"
            />
          </>
        ) : isGeneratingPRD ? (
          <>
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 sm:px-6 py-3 print:hidden">
              <div className="flex items-center gap-3">
                <button
                  className="md:hidden p-1.5 -ml-1.5 text-text-gray hover:text-primary-black dark:text-[#A0A0A0] dark:hover:text-[#F0F0F0]"
                  onClick={() => setIsMobileSidebarOpen(true)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                </button>
                <div className="flex items-center gap-2">
                  <h1 className="font-fustat text-sm sm:text-lg font-bold">
                    NovaPlan AI Sedang Mengetik PRD...
                  </h1>
                  <span className="flex gap-1 mt-1">
                    <span className="w-1.5 h-1.5 bg-accent-green rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-accent-green rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-accent-green rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </span>
                </div>
              </div>
            </div>
            <PrdViewer
              content={streamingPRDContent || "Mohon tunggu sebentar..."}
              projectName="Menyusun PRD..."
              plan={plan}
              className="flex-1 overflow-hidden"
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
            <div className="text-center max-w-lg">
              <button
                className="md:hidden mx-auto mb-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-light-gray-bg dark:bg-[#161616] text-sm font-medium"
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
                Buka Menu Proyek
              </button>
              <div className="flex justify-center mb-6 text-text-gray dark:text-[#A0A0A0]/50 hidden sm:flex">
                <FileText size={64} strokeWidth={1} />
              </div>
              <h2 className="font-fustat text-2xl font-bold mb-3">
                {localProjects.length > 0 ? "Pilih proyek" : "Belum ada proyek"}
              </h2>
              <p className="text-text-gray dark:text-[#A0A0A0] font-schibsted leading-relaxed mb-6">
                {localProjects.length > 0
                  ? "Pilih salah satu proyek dari daftar di samping untuk melihat PRD-nya."
                  : "Kamu belum punya proyek. Mulai buat PRD pertamamu dari beranda."}
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 btn-primary px-6 py-3 rounded-xl font-schibsted font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <Home size={16} />
                Mulai dari Beranda
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 3. Right Panel: Chat Panel */}
      <div
        id="print-hide-chat"
        style={{
          width: isChatOpen ? `${rightWidth}px` : "0px",
          background: "var(--bg-elevated)",
        }}
        className={cn(
          "shrink-0 border-l border-[var(--border-subtle)] relative group/right-sidebar print:hidden hidden xl:block",
          !isDraggingRight && "transition-all duration-300",
          !isChatOpen && "overflow-hidden border-none",
        )}
      >
        {/* Resize Handle */}
        {isChatOpen && (
          <div
            className="absolute left-[-4px] top-0 bottom-0 w-2 cursor-col-resize hover:bg-[var(--btn-bg)]/20 z-10 transition-colors"
            onMouseDown={() => setIsDraggingRight(true)}
          />
        )}

        <div className="h-full w-full">
          <ChatPanel
            projectId={projectId}
            conversationId={conversationId}
            onProjectCreated={handleProjectCreated}
            className="w-full"
            inputDisabled={!projectId && !isGeneratingPRD}
          />
        </div>
      </div>

      {/* Mobile Right Panel Overlay */}
      <div className="xl:hidden print:hidden">
        {isChatOpen && (
          <div className="fixed bottom-0 left-0 right-0 z-40 h-[60vh] rounded-t-2xl border border-border-subtle dark:border-white/10 bg-white dark:bg-[#1E1E1E] shadow-xl">
            <div className="flex items-center justify-between border-b border-border-subtle dark:border-white/10 px-4 py-2">
              <span className="text-sm font-medium">Chat</span>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-text-gray dark:text-[#A0A0A0] hover:text-primary-black dark:text-[#F0F0F0]"
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
              />
            </div>
          </div>
        )}
      </div>

      {deleteTargetId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setDeleteTargetId(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-[#1E1E1E] shadow-xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
          >
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <Trash2 size={24} strokeWidth={2} />
                </div>
                <button
                  onClick={() => setDeleteTargetId(null)}
                  className="text-text-gray dark:text-[#A0A0A0] transition-colors hover:text-primary-black dark:text-[#F0F0F0]"
                  aria-label="Tutup dialog"
                >
                  <X size={20} />
                </button>
              </div>

              <h3
                id="delete-project-title"
                className="mb-2 mt-2 font-fustat text-xl font-bold text-primary-black dark:text-[#F0F0F0]"
              >
                Hapus Proyek?
              </h3>
              <p className="mb-6 font-schibsted text-sm leading-relaxed text-text-gray dark:text-[#A0A0A0]">
                Proyek dan riwayat PRD terkait akan dihapus. Tindakan ini tidak bisa
                dibatalkan.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setDeleteTargetId(null)}
                  className="rounded-lg bg-light-gray-bg dark:bg-[#161616] px-4 py-3 text-center font-schibsted text-sm font-medium text-primary-black dark:text-[#F0F0F0] transition-colors hover:bg-border-subtle"
                  disabled={Boolean(isDeletingId)}
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteProject}
                  className="rounded-lg bg-red-600 px-4 py-3 text-center font-schibsted text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  disabled={Boolean(isDeletingId)}
                >
                  {isDeletingId ? "Menghapus..." : "Hapus Proyek"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div 
          className="fixed z-[100] bg-white dark:bg-[#1E1E1E] border border-border-subtle dark:border-white/10 rounded-lg shadow-xl w-40 py-1 font-schibsted"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="w-full text-left px-3 py-1.5 text-sm text-primary-black dark:text-[#F0F0F0] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            onClick={() => {
              setRenamingId(contextMenu.id);
              setRenameValue(contextMenu.name);
              setContextMenu(null);
            }}
          >
            Rename
          </button>
          <form action={duplicatePrd.bind(null, contextMenu.id)}>
            <button type="submit" className="w-full text-left px-3 py-1.5 text-sm text-primary-black dark:text-[#F0F0F0] hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              Duplicate
            </button>
          </form>
          <button 
            className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            onClick={(e) => {
              setContextMenu(null);
              requestDeleteProject(e, contextMenu.id);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
