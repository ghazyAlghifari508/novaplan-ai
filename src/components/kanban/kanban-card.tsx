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
        className={`group relative flex cursor-pointer flex-col rounded-lg border border-graphite bg-obsidian p-3 shadow-sm transition-all duration-300 hover:border-steel hover:shadow-md hover:scale-[1.01] border-l-4 ${colorClass} ${highlighted ? "ring-2 ring-amber animate-flash" : ""}`}
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
          <span className="inline-flex items-center gap-1 rounded-full bg-steel/10 px-2 py-0.5 text-[10px] text-mist">
            <span className={`h-1.5 w-1.5 rounded-full bg-current ${COLORS[idx].split(" ")[2]}`} />
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
        <DialogContent className="max-w-md mx-4 sm:mx-auto sm:translate-x-[-50%] sm:translate-y-[-50%] bottom-4 left-0 right-0 top-auto translate-y-0 sm:top-[50%] rounded-xl sm:rounded-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo uppercase tracking-wider mb-1">
              <Layers size={12} />
              {card.type} Detail
            </div>
            <DialogTitle className="text-lg font-bold text-snow">
              {card.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-fog">
              Fitur: <span className="font-[510] text-snow">{card.featureName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status Section */}
            <div className="flex items-center justify-between rounded-md bg-white/5 p-3">
              <span className="text-xs text-fog font-medium">Status</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                  card.status === "completed"
                    ? "bg-emerald/15 text-emerald"
                    : card.status === "in_progress"
                      ? "bg-indigo/15 text-indigo"
                      : card.status === "failed"
                        ? "bg-crimson/15 text-crimson"
                        : "bg-steel/15 text-steel"
                }`}
              >
                {card.status === "completed" && <CheckCircle2 size={12} />}
                {card.status === "in_progress" && <Play size={12} />}
                {card.status === "failed" && <AlertTriangle size={12} />}
                {card.status}
              </span>
            </div>

            {/* Description */}
            {card.description && (
              <div>
                <h4 className="text-xs font-semibold text-snow mb-1">Deskripsi</h4>
                <p className="text-sm text-fog bg-onyx/50 p-2.5 rounded border border-graphite/40 whitespace-pre-wrap">
                  {card.description}
                </p>
              </div>
            )}

            {/* Subtasks Checklist */}
            {card.type === "task" && card.subtasks && card.subtasks.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-semibold text-snow">Subtasks</h4>
                  <span className="text-[10px] text-fog font-medium bg-white/5 px-1.5 py-0.5 rounded">
                    {card.subtaskCompleted}/{card.subtaskCount}
                  </span>
                </div>
                <ul className="space-y-1.5 bg-onyx/30 p-2.5 rounded border border-graphite/40 max-h-40 overflow-y-auto custom-scrollbar">
                  {card.subtasks.map((sub) => (
                    <li key={sub.id} className="flex items-start gap-2 text-xs">
                      <div className="mt-0.5 shrink-0">
                        {sub.status === "completed" ? (
                          <CheckSquare size={14} className="text-emerald" />
                        ) : sub.status === "in_progress" ? (
                          <Play size={14} className="text-indigo" />
                        ) : sub.status === "failed" ? (
                          <AlertTriangle size={14} className="text-crimson" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-sm border border-graphite/60 bg-transparent" />
                        )}
                      </div>
                      <span className={`leading-relaxed ${sub.status === "completed" ? "text-fog line-through" : "text-snow/90"}`}>
                        {sub.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded border border-graphite/40 bg-onyx/30 p-2.5">
                <span className="block text-[10px] text-fog/60 uppercase">Mulai Kerja</span>
                <span className="font-mono text-snow/90 flex items-center gap-1 mt-1">
                  <Calendar size={12} />
                  {card.startedAt ? `${formatDate(card.startedAt)} ${formatTime(card.startedAt)}` : "-"}
                </span>
              </div>
              <div className="rounded border border-graphite/40 bg-onyx/30 p-2.5">
                <span className="block text-[10px] text-fog/60 uppercase">Selesai/Gagal</span>
                <span className="font-mono text-snow/90 flex items-center gap-1 mt-1">
                  <Calendar size={12} />
                  {card.completedAt ? `${formatDate(card.completedAt)} ${formatTime(card.completedAt)}` : "-"}
                </span>
              </div>
            </div>

            {/* Dependencies */}
            {card.type === "task" && card.dependencies && card.dependencies.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-snow mb-1.5">
                  Bergantung pada
                </h4>
                <ul className="space-y-1">
                  {card.dependencies.map((depId) => (
                    <li
                      key={depId}
                      className="text-xs text-amber font-mono bg-amber/5 px-2 py-1 rounded border border-amber/10 truncate"
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
