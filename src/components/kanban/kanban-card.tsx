"use client";

import { useState } from "react";
import { CheckSquare, ArrowRight, Play, CheckCircle2, AlertTriangle, Calendar, Layers } from "lucide-react";
import type { TaskCard } from "@/hooks/use-kanban-polling";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface KanbanCardProps {
  card: TaskCard;
  colorIndex: number;
  highlighted?: boolean;
}

const COLORS = [
  "border-indigo/80 bg-indigo/5 text-indigo",
  "border-emerald/80 bg-emerald/5 text-emerald",
  "border-amber/80 bg-amber/5 text-amber",
  "border-crimson/80 bg-crimson/5 text-crimson",
  "border-steel/80 bg-steel/5 text-steel",
];

const BORDER_COLORS = [
  "border-l-indigo",
  "border-l-emerald",
  "border-l-amber",
  "border-l-crimson",
  "border-l-steel",
];

export function KanbanCard({ card, colorIndex, highlighted = false }: KanbanCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const idx = colorIndex % COLORS.length;
  const colorClass = BORDER_COLORS[idx];

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsOpen(true); } }}
        className={`group relative flex cursor-pointer flex-col rounded-lg border border-(--border-medium) bg-obsidian p-3 shadow-sm transition-all duration-200 hover:border-steel hover:shadow-md ${highlighted ? "ring-2 ring-amber animate-flash" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-inter text-sm font-[510] text-snow line-clamp-2">
            {card.name}
          </span>
          <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-fog uppercase">
            {card.type}
          </span>
        </div>

        {card.description && (
          <p className="mt-1 text-xs text-fog line-clamp-2">{card.description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* Feature Badge */}
          <span className="inline-flex items-center gap-1 rounded-md bg-white/5 border border-graphite/40 px-2 py-0.5 text-[10px] text-mist">
            {card.featureName}
          </span>

          {/* Subtasks Count */}
          {card.type === "task" && card.subtaskCount ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-fog">
              <CheckSquare size={10} />
              {card.subtaskCompleted}/{card.subtaskCount}
            </span>
          ) : null}

          {/* Dependencies Badge */}
          {card.type === "task" && card.dependencies && card.dependencies.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber/80">
              <ArrowRight size={10} />
              dep: {card.dependencies.length}
            </span>
          )}
        </div>

        {/* Timestamps */}
        {(card.startedAt || card.completedAt) && (
          <div className="mt-2.5 border-t border-graphite/40 pt-2 flex items-center justify-between text-[10px] text-fog/60">
            {card.status === "in_progress" && card.startedAt && (
              <span>Mulai: {formatTime(card.startedAt)}</span>
            )}
            {(card.status === "completed" || card.status === "failed") && card.completedAt && (
              <span>Selesai: {formatDate(card.completedAt)} {formatTime(card.completedAt)}</span>
            )}
          </div>
        )}
      </div>

      {/* Task Details Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="!flex !flex-col max-w-lg max-h-[85vh] p-6 bg-obsidian border border-graphite rounded-xl overflow-hidden">
          <DialogHeader className="shrink-0 pb-3 border-b border-graphite/40">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo uppercase tracking-wider mb-1">
              <Layers size={14} />
              {card.type} Detail
            </div>
            <DialogTitle className="text-xl font-bold text-snow leading-snug">
              {card.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-fog mt-1">
              Fitur: <span className="font-[510] text-snow">{card.featureName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 mt-4 space-y-4 custom-scrollbar">
            {/* Status Section */}
            <div className="flex items-center justify-between rounded-lg border border-graphite/40 bg-onyx/60 p-3">
              <span className="text-xs text-fog font-medium">Status Task</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold uppercase ${
                  card.status === "completed"
                    ? "bg-emerald/15 text-emerald border border-emerald/30"
                    : card.status === "in_progress"
                      ? "bg-indigo/15 text-indigo border border-indigo/30"
                      : card.status === "failed"
                        ? "bg-crimson/15 text-crimson border border-crimson/30"
                        : "bg-steel/15 text-mist border border-steel/30"
                }`}
              >
                {card.status === "completed" && <CheckCircle2 size={13} />}
                {card.status === "in_progress" && <Play size={13} />}
                {card.status === "failed" && <AlertTriangle size={13} />}
                {card.status}
              </span>
            </div>

            {/* Description */}
            {card.description && (
              <div>
                <h4 className="text-xs font-semibold text-snow mb-1.5">Deskripsi</h4>
                <div className="text-xs text-snow/90 bg-onyx/80 p-3 rounded-lg border border-graphite/50 whitespace-pre-wrap leading-relaxed">
                  {card.description}
                </div>
              </div>
            )}

            {/* Subtasks Checklist */}
            {card.type === "task" && card.subtasks && card.subtasks.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-snow">Subtasks</h4>
                  <span className="text-[11px] text-fog font-mono bg-onyx px-2 py-0.5 rounded border border-graphite/40">
                    {card.subtaskCompleted} / {card.subtaskCount} Selesai
                  </span>
                </div>
                <ul className="space-y-2 bg-onyx/60 p-3 rounded-lg border border-graphite/50 max-h-56 overflow-y-auto custom-scrollbar">
                  {card.subtasks.map((sub, idx) => (
                    <li key={sub.id || idx} className="flex items-start gap-2.5 text-xs p-1.5 rounded hover:bg-white/5 transition-colors">
                      <div className="mt-0.5 shrink-0">
                        {sub.status === "completed" ? (
                          <CheckSquare size={15} className="text-emerald" />
                        ) : sub.status === "in_progress" ? (
                          <Play size={15} className="text-indigo animate-pulse" />
                        ) : sub.status === "failed" ? (
                          <AlertTriangle size={15} className="text-crimson" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-sm border border-graphite/80 bg-transparent mt-0.5" />
                        )}
                      </div>
                      <span className={`leading-relaxed ${sub.status === "completed" ? "text-fog line-through" : "text-snow"}`}>
                        {sub.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-graphite/50 bg-onyx/60 p-3">
                <span className="block text-[10px] text-fog uppercase tracking-wider font-semibold">Mulai Kerja</span>
                <span className="font-mono text-xs text-snow/90 flex items-center gap-1.5 mt-1.5">
                  <Calendar size={13} className="text-indigo" />
                  {card.startedAt ? `${formatDate(card.startedAt)} ${formatTime(card.startedAt)}` : "-"}
                </span>
              </div>
              <div className="rounded-lg border border-graphite/50 bg-onyx/60 p-3">
                <span className="block text-[10px] text-fog uppercase tracking-wider font-semibold">Selesai / Gagal</span>
                <span className="font-mono text-xs text-snow/90 flex items-center gap-1.5 mt-1.5">
                  <Calendar size={13} className="text-indigo" />
                  {card.completedAt ? `${formatDate(card.completedAt)} ${formatTime(card.completedAt)}` : "-"}
                </span>
              </div>
            </div>

            {/* Dependencies */}
            {card.type === "task" && card.dependencies && card.dependencies.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-snow mb-1.5">
                  Bergantung pada Task
                </h4>
                <ul className="space-y-1.5">
                  {card.dependencies.map((depId) => (
                    <li
                      key={depId}
                      className="text-xs text-amber font-mono bg-amber/10 px-2.5 py-1.5 rounded-md border border-amber/20 truncate"
                      title={depId}
                    >
                      Task ID: {depId}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
