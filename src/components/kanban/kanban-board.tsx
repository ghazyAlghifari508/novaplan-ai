"use client";

import { useKanbanPolling } from "@/hooks/use-kanban-polling";
import { KanbanBanner } from "./kanban-banner";
import { Sparkles, Loader2, KanbanSquare, ArrowUpDown, X, AlertTriangle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { KanbanColumn, type KanbanColumnHandle } from "./kanban-column";

interface KanbanBoardProps {
  projectId: string;
  projectName: string;
}

export function KanbanBoard({ projectId, projectName }: KanbanBoardProps) {
  const { data, isLoading, isError, staleness, refetch } = useKanbanPolling({
    projectId,
    intervalMs: 10000,
  });

  const columns = data?.columns;
  const lastUpdateAt = data?.lastUpdateAt;

  // Track card movements for animation
  const prevColumnsRef = useRef<typeof columns | null>(null);
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);
  const [dismissedBanners, setDismissedBanners] = useState<string[]>([]);
  const columnRefsRef = useRef<Record<string, KanbanColumnHandle | null>>({});

  const hasTasks =
    columns &&
    (columns.pending.length > 0 ||
      columns.in_progress.length > 0 ||
      columns.completed.length > 0 ||
      columns.failed.length > 0);

  const hasUpdates =
    columns &&
    (columns.in_progress.length > 0 ||
      columns.completed.length > 0 ||
      columns.failed.length > 0);

  // Detect card movements between columns and trigger animation
  useEffect(() => {
    if (!prevColumnsRef.current || !columns) {
      prevColumnsRef.current = columns;
      return;
    }

    const prev = prevColumnsRef.current;
    const curr = columns;
    const statuses = ["pending", "in_progress", "completed", "failed"] as const;

    for (const status of statuses) {
      const prevIds = new Set((prev[status] || []).map((c) => c.id));
      const currIds = new Set((curr[status] || []).map((c) => c.id));

      // Find newly added cards to this column
      for (const id of currIds) {
        if (!prevIds.has(id)) {
          // Card moved TO this column
          setHighlightedCardId(id);
          // Auto-scroll to the column containing this card
          setTimeout(() => {
            const colRef = columnRefsRef.current[status];
            colRef?.scrollIntoView();
          }, 100);
          break;
        }
      }
    }
    prevColumnsRef.current = columns;
  }, [columns]);

  // Clear highlight after animation
  useEffect(() => {
    if (highlightedCardId) {
      const timer = setTimeout(() => setHighlightedCardId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedCardId]);

  // AC changed comes from API response (compares ac_versions.created_at vs tasks.created_at)
  const acChanged = data?.acChanged || false;

  // Pull-to-refresh for mobile
  const [touchStart, setTouchStart] = useState(0);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientY);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart - e.touches[0].clientY < -100) {
      refetch();
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-full w-full flex-col bg-onyx text-snow">
        <div className="flex items-center justify-between border-b border-graphite bg-obsidian px-6 py-3.5">
          <div className="h-6 w-48 animate-pulse rounded bg-steel/20" />
          <div className="h-8 w-24 animate-pulse rounded bg-steel/20" />
        </div>
        <div className="flex flex-1 gap-6 py-6 px-0 overflow-hidden">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="flex h-full flex-1 min-w-[260px] shrink-0 flex-col rounded-xl border border-graphite bg-obsidian/30 animate-pulse"
            >
              <div className="h-12 border-b border-graphite/40 bg-obsidian/50 rounded-t-xl" />
              <div className="flex-1 p-3 space-y-3">
                <div className="h-24 rounded bg-steel/10" />
                <div className="h-20 rounded bg-steel/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="flex h-full w-full flex-col bg-onyx text-snow items-center justify-center p-6">
        <AlertTriangleIllustration />
        <h2 className="mt-4 text-lg font-bold text-snow">Gagal memuat Kanban</h2>
        <p className="mt-2 text-sm text-fog max-w-xs text-center">
          Koneksi ke server bermasalah. Pastikan internet Anda aktif dan coba lagi.
        </p>
        <Button onClick={refetch} variant="default" className="mt-6 gap-1.5">
          <Loader2 size={14} className="hidden" />
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex h-dvh flex-col bg-onyx text-snow overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* Kanban Header / Navigation bar */}
      <div className="flex items-center justify-between border-b border-graphite bg-obsidian px-6 py-3.5 shrink-0">
        <div className="flex items-center gap-3">
          <KanbanSquare size={20} className="text-indigo" />
          <h1 className="truncate font-inter text-lg font-[510] text-snow">
            Kanban - {projectName}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdateAt && (
            <span className="text-[10px] text-fog/60 font-mono hidden sm:inline">
              Update: {new Date(lastUpdateAt).toLocaleTimeString()}
            </span>
          )}
          <Link href={`/task/${projectId}`} className="btn-primary px-3 py-1.5 rounded-md text-xs font-[510]">
            Roadmap
          </Link>
          <Link href="/" className="btn-primary px-3 py-1.5 rounded-md text-xs font-[510] flex items-center gap-1.5">
            <Home size={14} />
            Home
          </Link>
        </div>
      </div>

      {/* Dismissable Banners */}
      {!dismissedBanners.includes("staleness") && (
        <KanbanBanner
          staleness={staleness}
          hasUpdates={!!hasUpdates}
          onRetry={refetch}
          isRetrying={isLoading}
          onDismiss={() => setDismissedBanners((prev) => [...prev, "staleness"])}
        />
      )}

      {/* AC Changed Banner */}
      {!dismissedBanners.includes("ac-changed") && acChanged && (
        <div className="flex items-center justify-between border-b border-amber/30 bg-amber/10 px-4 py-2 text-sm text-amber animate-slide-down">
          <AlertTriangle size={14} className="shrink-0 mx-2" />
          <span className="flex-1">AC telah berubah. Task mungkin tidak sesuai kriteria terbaru.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissedBanners((prev) => [...prev, "ac-changed"])}
            className="h-7 text-amber hover:bg-amber/10"
          >
            <ArrowUpDown size={12} />
            Tutup
          </Button>
        </div>
      )}

      {/* Progress Bar */}
      {hasTasks && (() => {
        const total = columns!.pending.length + columns!.in_progress.length + columns!.completed.length + columns!.failed.length;
        const done = columns!.completed.length + columns!.failed.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <div className="shrink-0 px-4 pt-3 pb-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-mist">Progress</span>
              <span className="text-xs text-fog font-mono">{done}/{total} task selesai ({pct}%)</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-steel/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo transition-all duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })()}

      {/* Main Column Layout Area */}
      <div
        className="flex-1 overflow-x-auto overflow-y-hidden select-none custom-scrollbar snap-x snap-mandatory sm:snap-none"
        role="list"
        aria-label="Kanban columns"
      >
        {!hasTasks ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <KanbanSquare size={64} className="text-fog/40 mb-4" />
            <h2 className="text-lg font-[510] text-snow">Belum ada task board</h2>
            <p className="text-xs text-fog max-w-sm mt-1.5 mb-6 leading-relaxed">
              Buat task & subtask diagram terlebih dahulu di whiteboard workspace agar papan kanban otomatis terisi.
            </p>
            <Link
              href={`/task/${projectId}`}
              className="btn-primary inline-flex items-center gap-2 rounded-md px-5 py-2.5 font-[510]"
            >
              <Sparkles size={16} />
              Generate Task Diagram
            </Link>
          </div>
        ) : (
          <div className="flex h-full w-full gap-4 py-6 px-4">
            <KanbanColumn
              ref={(el) => {
                columnRefsRef.current.pending = el;
              }}
              title="Belum Mulai"
              count={columns?.pending.length || 0}
              cards={columns?.pending || []}
              highlightedCardId={highlightedCardId}
            />
            <KanbanColumn
              ref={(el) => {
                columnRefsRef.current.in_progress = el;
              }}
              title="Dikerjakan"
              count={columns?.in_progress.length || 0}
              cards={columns?.in_progress || []}
              highlightedCardId={highlightedCardId}
            />
            <KanbanColumn
              ref={(el) => {
                columnRefsRef.current.completed = el;
              }}
              title="Selesai"
              count={columns?.completed.length || 0}
              cards={columns?.completed || []}
              highlightedCardId={highlightedCardId}
            />
            <KanbanColumn
              ref={(el) => {
                columnRefsRef.current.failed = el;
              }}
              title="Gagal"
              count={columns?.failed.length || 0}
              cards={columns?.failed || []}
              highlightedCardId={highlightedCardId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function AlertTriangleIllustration() {
  return (
    <div className="rounded-full bg-crimson/15 p-4 text-crimson">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </div>
  );
}
