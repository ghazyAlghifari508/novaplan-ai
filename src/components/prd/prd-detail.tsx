"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PrdViewer } from "./prd-viewer";
import { VersionHistory } from "./version-history";
import { ChatPanel } from "@/components/chat";
import { PrdActions } from "./prd-actions";
import { useChatStore } from "@/store";
import { cn } from "@/lib/utils";
import type { PrdVersion, Plan } from "@/types/database";
import Link from "next/link";
import { Infinity as InfinityIcon, FileText, X, Trash2 } from "lucide-react";

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
}: PrdDetailProps) {
  const [currentContent, setCurrentContent] = useState(latestVersion?.content || "");
  const [isChatOpen, setIsChatOpen] = useState(initialChatOpen);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  
  // Resize state
  const [leftWidth, setLeftWidth] = useState(256); // w-64 = 256px
  const [rightWidth, setRightWidth] = useState(380);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  
  const router = useRouter();
  const { isGeneratingPRD, streamingPRDContent, setGeneratingPRD, setStreamingPRDContent } = useChatStore();

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

  // Clean up streaming state on unmount
  useEffect(() => {
    return () => {
      setGeneratingPRD(false);
      setStreamingPRDContent("");
    };
  }, [setGeneratingPRD, setStreamingPRDContent]);

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
    router.push(`/prd/${newProjectId}`);
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm("Apakah Anda yakin ingin menghapus proyek ini?")) return;
    
    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus proyek");
      
      if (projectId === id) {
        router.push("/prd");
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Gagal menghapus proyek.");
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* 1. Left Panel: Project History Sidebar */}
      <div 
        style={{ width: `${leftWidth}px`, background: "var(--bg-surface)" }}
        className="shrink-0 border-r border-[var(--border-subtle)] flex flex-col relative group/left-sidebar"
      >
        {/* Resize Handle */}
        <div 
          className="absolute right-[-4px] top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary-black/20 z-10 transition-colors"
          onMouseDown={() => setIsDraggingLeft(true)}
        />

        <div className="p-4 border-b border-border-subtle flex items-center justify-between">
          <span className="font-schibsted font-semibold text-sm">Histori PRD</span>
          <Link
            href="/prd"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-primary-black px-3 text-xs font-medium hover:opacity-90 transition-opacity"
            style={{ color: "white" }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Baru
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {projects.length === 0 ? (
            <div className="p-4 text-center text-xs text-text-gray">
              Belum ada proyek.
            </div>
          ) : (
            projects.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "group flex items-center justify-between w-full rounded-lg transition-colors",
                  projectId === p.id
                    ? "bg-black/5 font-medium text-primary-black"
                    : "text-text-gray hover:bg-black/5 hover:text-primary-black"
                )}
              >
                <Link
                  href={`/prd/${p.id}`}
                  className="flex-1 block px-3 py-2.5 text-sm truncate font-schibsted"
                >
                  {p.name}
                </Link>
                <button
                  onClick={(e) => handleDeleteProject(e, p.id)}
                  disabled={isDeletingId === p.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 mr-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-md disabled:opacity-50 flex-shrink-0"
                  title="Hapus proyek"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Center Panel: PRD Viewer or Empty State */}
      <div className="flex flex-1 flex-col overflow-hidden" style={{ background: "var(--bg-page)" }}>
        {projectId && latestVersion ? (
          <>
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-3">
              <div className="flex items-center gap-4">
                <h1 className="font-fustat text-lg font-bold">{projectName}</h1>
                <PrdActions
                  projectId={projectId}
                  currentName={projectName || ""}
                />
              </div>

              <div className="flex items-center gap-3">
                {revisionLimit !== undefined && (
                  <span className="flex items-center gap-1 rounded-full bg-light-gray-bg px-3 py-1 text-xs font-medium text-text-gray">
                    Revisi: {allVersions.length > 0 ? allVersions.length - 1 : 0}/{revisionLimit === -1 ? <InfinityIcon size={12} strokeWidth={3} /> : revisionLimit}
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
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    isChatOpen
                      ? "bg-primary-black"
                      : "bg-light-gray-bg text-text-gray hover:text-primary-black",
                  )}
                  style={isChatOpen ? { color: "white" } : undefined}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M2 1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h9.586a2 2 0 0 1 1.414.586l2 2V2a1 1 0 0 0-1-1H2zm12-1a2 2 0 0 1 2 2v11.793a1 1 0 0 1-1.65.759L11.172 11H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h12z" />
                  </svg>
                  {isChatOpen ? "Hide Chat" : "Chat"}
                </button>
              </div>
            </div>

            <PrdViewer
              content={isGeneratingPRD && streamingPRDContent ? streamingPRDContent : currentContent}
              projectName={projectName || ""}
              plan={plan}
            />
          </>
        ) : isGeneratingPRD ? (
          <>
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-3">
              <div className="flex items-center gap-4">
                <h1 className="font-fustat text-lg font-bold animate-pulse">Menyusun PRD...</h1>
              </div>
            </div>
            <PrdViewer
              content={streamingPRDContent || "Menyiapkan kerangka dokumen..."}
              projectName="Menyusun PRD..."
              plan={plan}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-lg">
              <div className="flex justify-center mb-6 text-text-gray/50">
                <FileText size={64} strokeWidth={1} />
              </div>
              <h2 className="font-fustat text-2xl font-bold mb-3">
                Siap membuat PRD?
              </h2>
              <p className="text-text-gray font-schibsted leading-relaxed">
                Mulai chat di panel kanan. Ceritakan produk impianmu, dan AI akan otomatis meng-generate spesifikasi PRD secara lengkap dan profesional.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Right Panel: Chat Panel */}
      <div 
        style={{ width: isChatOpen ? `${rightWidth}px` : "0px", background: "var(--bg-elevated)" }}
        className={cn(
          "shrink-0 border-l border-[var(--border-subtle)] relative group/right-sidebar",
          !isDraggingRight && "transition-all duration-300",
          !isChatOpen && "overflow-hidden border-none"
        )}
      >
        {/* Resize Handle */}
        {isChatOpen && (
          <div 
            className="absolute left-[-4px] top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary-black/20 z-10 transition-colors"
            onMouseDown={() => setIsDraggingRight(true)}
          />
        )}
        
        <div className="h-full w-full">
          <ChatPanel
            projectId={projectId}
            conversationId={conversationId}
            onProjectCreated={handleProjectCreated}
            className="w-full"
          />
        </div>
      </div>

      {/* Mobile Right Panel Overlay */}
      <div className="xl:hidden">
        {isChatOpen && (
          <div className="fixed bottom-0 left-0 right-0 z-40 h-[60vh] rounded-t-2xl border border-border-subtle bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
              <span className="text-sm font-medium">Chat</span>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-text-gray hover:text-primary-black"
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
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
