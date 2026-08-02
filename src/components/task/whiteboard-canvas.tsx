"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCanvasZoom } from "@/hooks/use-canvas-zoom";
import { ZoomControls } from "./zoom-controls";
import { ChevronRight, X } from "lucide-react";
import type { TaskTree } from "@/lib/services/task-service";

// Layout constants
const ROOT_W = 200;
const ROOT_H = 56;
const FEATURE_W = 260;
const FEATURE_H = 64;
const TASK_W = 280;
const TASK_MIN_H = 80;
const SUBTASK_LINE_H = 24;
const TASK_HEADER_H = 44;
const TASK_FOOTER_H = 32;
const MAX_VISIBLE_SUBTASKS = 3;
const DETAIL_W = 240;
const DETAIL_H = 52;
const DETAIL_GAP_Y = 12;

const LEVEL_GAP_X = 120;
const SIBLING_GAP_Y = 24;

// Color palette per feature
const COLORS = [
  { bg: "bg-indigo/10", border: "border-indigo/40", badge: "bg-indigo", accent: "#6366f1" },
  { bg: "bg-emerald/10", border: "border-emerald/40", badge: "bg-emerald", accent: "#10b981" },
  { bg: "bg-amber-500/10", border: "border-amber-500/40", badge: "bg-amber-500", accent: "#f59e0b" },
  { bg: "bg-crimson/10", border: "border-crimson/40", badge: "bg-crimson", accent: "#ef4444" },
  { bg: "bg-sky-500/10", border: "border-sky-500/40", badge: "bg-sky-500", accent: "#0ea5e9" },
  { bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/40", badge: "bg-fuchsia-500", accent: "#d946ef" },
];

interface LayoutNode {
  id: string;
  type: "root" | "feature" | "task" | "detail";
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  colorIdx: number;
  phase?: number;
  taskCount?: number;
  subtasks?: Array<{ name: string }>;
  totalSubtasks?: number;
  parentSubtask?: string;
}

interface LayoutEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

function layoutGraph(
  tree: TaskTree,
  projectName: string,
): { nodes: LayoutNode[]; edges: LayoutEdge[]; width: number; height: number } {
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  const features = tree.features;
  if (features.length === 0) return { nodes, edges, width: 0, height: 0 };

  function taskCardH(subtaskCount: number): number {
    const visible = Math.min(subtaskCount, MAX_VISIBLE_SUBTASKS);
    return TASK_HEADER_H + visible * SUBTASK_LINE_H + (subtaskCount > MAX_VISIBLE_SUBTASKS ? TASK_FOOTER_H : 12);
  }

  function detailsCount(task: TaskTree["features"][number]["tasks"][number]): number {
    return task.subtasks.reduce((s, sub) => s + (sub.details?.length ?? 0), 0);
  }

  function detailStackH(count: number): number {
    return count === 0 ? 0 : count * DETAIL_H + (count - 1) * DETAIL_GAP_Y;
  }

  // Pass 1: compute feature subtree heights (sum of its task cards + gaps)
  // ownH = task card's real visual height (content-driven). slotH = space reserved
  // for the task's row (may be taller than ownH when its details stack exceeds the
  // card height), the task card is centered within slotH so edges targeting the
  // slot's vertical center always line up with the card, not empty space.
  const featureHeights: number[] = [];
  const featureTaskOwnHeights: number[][] = [];
  const featureTaskSlotHeights: number[][] = [];
  for (const feature of features) {
    const ownHs = feature.tasks.map((t) => Math.max(TASK_MIN_H, taskCardH(t.subtasks.length)));
    const slotHs = feature.tasks.map((t, ti) => Math.max(ownHs[ti], detailStackH(detailsCount(t))));
    featureTaskOwnHeights.push(ownHs);
    featureTaskSlotHeights.push(slotHs);
    const total = slotHs.reduce((s, h) => s + h, 0) + Math.max(0, slotHs.length - 1) * SIBLING_GAP_Y;
    featureHeights.push(Math.max(FEATURE_H, total));
  }

  // Pass 2: position features vertically, centered
  const totalFeatureHeight = featureHeights.reduce((s, h) => s + h, 0) + (features.length - 1) * SIBLING_GAP_Y;

  // Root node
  const rootX = 40;
  const rootY = totalFeatureHeight / 2 - ROOT_H / 2 + 40;
  nodes.push({
    id: "root",
    type: "root",
    label: projectName,
    x: rootX,
    y: rootY,
    w: ROOT_W,
    h: ROOT_H,
    colorIdx: 0,
  });

  const featureX = rootX + ROOT_W + LEVEL_GAP_X;
  let featureCursorY = 40;

  for (let fi = 0; fi < features.length; fi++) {
    const feature = features[fi];
    const fh = featureHeights[fi];
    const featureY = featureCursorY + fh / 2 - FEATURE_H / 2;
    const colorIdx = fi % COLORS.length;

    nodes.push({
      id: `f-${fi}`,
      type: "feature",
      label: feature.name,
      x: featureX,
      y: featureY,
      w: FEATURE_W,
      h: FEATURE_H,
      colorIdx,
      phase: fi + 1,
      taskCount: feature.tasks.length,
    });

    // Edge: root → feature
    edges.push({
      x1: rootX + ROOT_W,
      y1: rootY + ROOT_H / 2,
      x2: featureX,
      y2: featureY + FEATURE_H / 2,
      color: COLORS[colorIdx].accent,
    });

    // Tasks
    const taskX = featureX + FEATURE_W + LEVEL_GAP_X;
    const ownHs = featureTaskOwnHeights[fi];
    const slotHs = featureTaskSlotHeights[fi];
    const totalTaskH = slotHs.reduce((s, h) => s + h, 0) + Math.max(0, slotHs.length - 1) * SIBLING_GAP_Y;
    let taskCursorY = featureCursorY + fh / 2 - totalTaskH / 2;

    for (let ti = 0; ti < feature.tasks.length; ti++) {
      const task = feature.tasks[ti];
      const ownH = ownHs[ti];
      const slotH = slotHs[ti];
      // Card centered within its slot so its true visual midpoint (cardY + ownH/2)
      // equals the slot midpoint (taskCursorY + slotH/2), edges target the slot
      // midpoint, so this keeps them landing on the actual rendered card, not
      // empty space below it when the detail stack makes the slot taller than the card.
      const cardY = taskCursorY + slotH / 2 - ownH / 2;
      const slotMidY = taskCursorY + slotH / 2;

      nodes.push({
        id: `f-${fi}-t-${ti}`,
        type: "task",
        label: task.name,
        x: taskX,
        y: cardY,
        w: TASK_W,
        h: ownH,
        colorIdx,
        subtasks: task.subtasks,
        totalSubtasks: task.subtasks.length,
      });

      // Edge: feature → task
      edges.push({
        x1: featureX + FEATURE_W,
        y1: featureY + FEATURE_H / 2,
        x2: taskX,
        y2: slotMidY,
        color: COLORS[colorIdx].accent,
      });

      // Details: one node per detail item, flattened across this task's subtasks
      const details = task.subtasks.flatMap((sub) =>
        (sub.details ?? []).map((text) => ({ text, parentSubtask: sub.name })),
      );
      if (details.length > 0) {
        const detailX = taskX + TASK_W + LEVEL_GAP_X;
        const totalDetailH = detailStackH(details.length);
        let detailCursorY = slotMidY - totalDetailH / 2;

        for (let di = 0; di < details.length; di++) {
          nodes.push({
            id: `f-${fi}-t-${ti}-d-${di}`,
            type: "detail",
            label: details[di].text,
            parentSubtask: details[di].parentSubtask,
            x: detailX,
            y: detailCursorY,
            w: DETAIL_W,
            h: DETAIL_H,
            colorIdx,
          });

          edges.push({
            x1: taskX + TASK_W,
            y1: slotMidY,
            x2: detailX,
            y2: detailCursorY + DETAIL_H / 2,
            color: COLORS[colorIdx].accent,
          });

          detailCursorY += DETAIL_H + DETAIL_GAP_Y;
        }
      }

      taskCursorY += slotH + SIBLING_GAP_Y;
    }

    featureCursorY += fh + SIBLING_GAP_Y;
  }

  const maxX = nodes.reduce((m, n) => Math.max(m, n.x + n.w), 0);
  const maxY = nodes.reduce((m, n) => Math.max(m, n.y + n.h), 0);

  return { nodes, edges, width: maxX + 80, height: maxY + 80 };
}

// Dot-grid CSS: thicker, more visible
const DOT_BG_IMAGE = "radial-gradient(circle, var(--color-graphite) 1.5px, transparent 1.5px)";
const DOT_BG_SIZE = "20px 20px";

interface WhiteboardCanvasProps {
  projectName?: string;
  taskTree?: TaskTree | null;
}

export const WhiteboardCanvas = memo(function WhiteboardCanvas({
  projectName = "Project",
  taskTree,
}: WhiteboardCanvasProps) {
  const { zoom, pan, setZoom, setPan, zoomIn, zoomOut, resetZoom, startPan, updatePan, endPan, nudgePan, onWheel, minZoom, maxZoom } = useCanvasZoom();
  const [openDetail, setOpenDetail] = useState<LayoutNode | null>(null);
  const [openTask, setOpenTask] = useState<LayoutNode | null>(null);

  const features = taskTree?.features ?? [];
  const isEmpty = features.length === 0;

  const { nodes, edges, width: canvasWidth, height: canvasHeight } = useMemo(
    () => (taskTree && !isEmpty ? layoutGraph(taskTree, projectName) : { nodes: [], edges: [], width: 0, height: 0 }),
    [taskTree, projectName, isEmpty],
  );

  // Auto-fit zoom: scale diagram to fit viewport
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (!canvasWidth || !canvasHeight || !containerRef.current || hasFittedRef.current) return;
    hasFittedRef.current = true;

    const rect = containerRef.current.getBoundingClientRect();
    const padding = 60;
    const fitW = (rect.width - padding * 2) / canvasWidth;
    const fitH = (rect.height - padding * 2) / canvasHeight;
    const fitZoom = Math.min(fitW, fitH, 1);
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, fitZoom));

    setZoom(clampedZoom);
    const offsetX = (rect.width - canvasWidth * clampedZoom) / 2;
    const offsetY = (rect.height - canvasHeight * clampedZoom) / 2;
    setPan({ x: offsetX, y: offsetY });
  }, [canvasWidth, canvasHeight, setZoom, setPan, minZoom, maxZoom]);

  useEffect(() => {
    hasFittedRef.current = false;
  }, [taskTree]);

  const skeletonCanvasW = 900;
  const skeletonCanvasH = 500;

  // Modal open freezes the board: pan/zoom/keyboard-nudge all no-op until closed.
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (openDetail || openTask) {
      if (e.key === "Escape") { setOpenDetail(null); setOpenTask(null); }
      return;
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      nudgePan(e.key, 40);
    }
  }, [nudgePan, openDetail, openTask]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (openDetail || openTask) return;
    startPan(e);
  }, [openDetail, openTask, startPan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (openDetail || openTask) return;
    updatePan(e);
  }, [openDetail, openTask, updatePan]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (openDetail || openTask) return;
    onWheel(e);
  }, [openDetail, openTask, onWheel]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full touch-none overflow-hidden overscroll-none bg-onyx outline-none focus-visible:ring-2 focus-visible:ring-indigo/40 cursor-grab active:cursor-grabbing"
      style={{
        backgroundImage: DOT_BG_IMAGE,
        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPan}
      onPointerLeave={endPan}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Kanvas diagram task"
    >
      {isEmpty ? (
        <div
          className="absolute left-0 top-0 origin-top-left will-change-transform"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, width: skeletonCanvasW, height: skeletonCanvasH }}
        >
          <SkeletonDiagram />
        </div>
      ) : (
        <>
          <div
            className="absolute left-0 top-0 origin-top-left will-change-transform"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, width: canvasWidth, height: canvasHeight }}
          >
            {/* SVG edges */}
            <svg aria-hidden className="pointer-events-none absolute left-0 top-0" width={canvasWidth} height={canvasHeight} style={{ overflow: "visible" }}>
              {edges.map((e, i) => {
                const midX = (e.x1 + e.x2) / 2;
                return (
                  <path
                    key={`edge-${i}`}
                    d={`M ${e.x1} ${e.y1} C ${midX} ${e.y1}, ${midX} ${e.y2}, ${e.x2} ${e.y2}`}
                    fill="none" stroke={e.color} strokeWidth={1.5} strokeOpacity={0.5}
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => {
              if (node.type === "root") return <RootNode key={node.id} node={node} />;
              if (node.type === "feature") return <FeatureNode key={node.id} node={node} />;
              if (node.type === "detail") return <DetailNode key={node.id} node={node} onOpen={setOpenDetail} />;
              return <TaskCard key={node.id} node={node} onOpen={() => setOpenTask(node)} />;
            })}
          </div>

          <ZoomControls
            zoom={zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onReset={resetZoom}
            className="absolute bottom-4 left-4"
          />
        </>
      )}
      {openDetail && typeof document !== "undefined" &&
        createPortal(<DetailModal node={openDetail} onClose={() => setOpenDetail(null)} />, document.body)}
      {openTask && typeof document !== "undefined" &&
        createPortal(<TaskSubtasksModal node={openTask} onClose={() => setOpenTask(null)} />, document.body)}
    </div>
  );
});

/* ── Skeleton diagram ── */

function SkeletonDiagram() {
  const rootX = 40;
  const rootY = 210;
  const featureX = rootX + ROOT_W + LEVEL_GAP_X;
  const taskX = featureX + FEATURE_W + LEVEL_GAP_X;

  return (
    <>
      <div className="absolute flex animate-pulse items-center justify-center rounded-xl border-2 border-fog/20 bg-fog/5"
        style={{ left: rootX, top: rootY, width: ROOT_W, height: ROOT_H }}>
        <div className="h-4 w-24 rounded bg-fog/10" />
      </div>

      {[0, 1, 2].map((i) => {
        const fy = 40 + i * 150;
        return (
          <div key={`skel-${i}`}>
            <svg className="pointer-events-none absolute left-0 top-0" width={taskX + TASK_W + 10} height={fy + FEATURE_H + 10} style={{ overflow: "visible" }}>
              <path d={`M ${rootX + ROOT_W} ${rootY + ROOT_H / 2} C ${featureX - 40} ${rootY + ROOT_H / 2}, ${featureX - 40} ${fy + FEATURE_H / 2}, ${featureX} ${fy + FEATURE_H / 2}`}
                fill="none" stroke="var(--color-fog)" strokeWidth={1} strokeOpacity={0.15} strokeDasharray="6 4" />
            </svg>
            <div className="absolute animate-pulse rounded-lg border border-fog/15 bg-fog/5"
              style={{ left: featureX, top: fy, width: FEATURE_W, height: FEATURE_H }}>
              <div className="flex h-full flex-col justify-center px-4 gap-2">
                <div className="h-3 w-12 rounded bg-fog/10" />
                <div className="h-4 w-36 rounded bg-fog/10" />
              </div>
            </div>
            {[0, 1].map((j) => {
              const ty = fy + j * 100;
              return (
                <div key={`skel-t-${i}-${j}`}>
                  <svg className="pointer-events-none absolute left-0 top-0" width={taskX + TASK_W + 10} height={ty + 80} style={{ overflow: "visible" }}>
                    <path d={`M ${featureX + FEATURE_W} ${fy + FEATURE_H / 2} C ${taskX - 40} ${fy + FEATURE_H / 2}, ${taskX - 40} ${ty + 40}, ${taskX} ${ty + 40}`}
                      fill="none" stroke="var(--color-fog)" strokeWidth={1} strokeOpacity={0.15} strokeDasharray="6 4" />
                  </svg>
                  <div className="absolute animate-pulse rounded-lg border border-fog/10 bg-fog/[0.03]"
                    style={{ left: taskX, top: ty, width: TASK_W, height: 80 }}>
                    <div className="px-3 py-3 space-y-2">
                      <div className="h-3 w-28 rounded bg-fog/[0.08]" />
                      <div className="h-2.5 w-20 rounded bg-fog/[0.06]" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

/* ── Node components ── */

function RootNode({ node }: { node: LayoutNode }) {
  return (
    <div className="absolute flex items-center justify-center rounded-xl border-2 border-indigo/60 bg-indigo/10 shadow-lg shadow-indigo/10 animate-fadeIn"
      style={{ left: node.x, top: node.y, width: node.w, height: node.h }}>
      <span className="truncate px-4 font-inter text-sm font-semibold text-snow">{node.label}</span>
    </div>
  );
}

function FeatureNode({ node }: { node: LayoutNode }) {
  const color = COLORS[node.colorIdx];
  return (
    <div className={`absolute rounded-lg border ${color.border} ${color.bg} shadow-md animate-fadeIn`}
      style={{ left: node.x, top: node.y, width: node.w, height: node.h }}>
      <div className="flex h-full flex-col justify-center px-4">
        <div className="mb-1 flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white ${color.badge}`}>
            Fase {node.phase}
          </span>
          <span className="text-[10px] text-fog">Direncanakan</span>
        </div>
        <p className="truncate font-inter text-sm font-[510] text-snow" title={node.label}>{node.label}</p>
      </div>
    </div>
  );
}

function DetailNode({ node, onOpen }: { node: LayoutNode; onOpen: (node: LayoutNode) => void }) {
  const color = COLORS[node.colorIdx];
  return (
    <div
      className={`absolute rounded-md border ${color.border} bg-obsidian shadow-sm animate-fadeIn px-3 py-2 cursor-pointer`}
      style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
      onClick={(e) => { e.stopPropagation(); onOpen(node); }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {node.parentSubtask && (
        <p className="truncate text-[9px] uppercase tracking-wide text-fog/60">{node.parentSubtask}</p>
      )}
      <p className="truncate font-inter text-[11px] text-snow">{node.label}</p>
    </div>
  );
}

// Rendered via portal to document.body, must not live under the canvas's
// panned/scaled wrapper, since `fixed` positioning is relative to the nearest
// transformed ancestor, not the viewport, and would render mispositioned.
function DetailModal({ node, onClose }: { node: LayoutNode; onClose: () => void }) {
  const color = COLORS[node.colorIdx];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-xl border ${color.border} bg-obsidian p-5 shadow-[var(--shadow-overlay)] animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          {node.parentSubtask && (
            <p className="text-xs uppercase tracking-wide text-fog/60">{node.parentSubtask}</p>
          )}
          <button onClick={onClose} className="ml-auto shrink-0 text-fog transition-colors hover:text-snow">
            <X size={18} />
          </button>
        </div>
        <p className="font-inter text-sm leading-relaxed text-snow">{node.label}</p>
      </div>
    </div>
  );
}

// Modal daftar subtask: UI match DetailModal (portal, overlay, color border, X close).
function TaskSubtasksModal({ node, onClose }: { node: LayoutNode; onClose: () => void }) {
  const color = COLORS[node.colorIdx];
  const allSubtasks = node.subtasks ?? [];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl border ${color.border} bg-obsidian p-5 shadow-[var(--shadow-overlay)] animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2">
          <div className={`h-2 w-2 shrink-0 rounded-full ${color.badge}`} />
          <p className="truncate font-inter text-sm font-[510] text-snow">{node.label}</p>
          <span className="ml-auto shrink-0 text-xs text-fog">{allSubtasks.length} subtask</span>
          <button onClick={onClose} className="shrink-0 text-fog transition-colors hover:text-snow">
            <X size={18} />
          </button>
        </div>
        <ul className="space-y-2">
          {allSubtasks.map((s, i) => (
            <li key={i} className="rounded-lg border border-graphite/60 bg-charcoal/40 px-3 py-2">
              <p className="font-inter text-sm text-snow">{s.name}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TaskCard({ node, onOpen }: { node: LayoutNode; onOpen: () => void }) {
  const color = COLORS[node.colorIdx];
  const allSubtasks = node.subtasks ?? [];
  const total = node.totalSubtasks ?? allSubtasks.length;
  const hasMore = total > MAX_VISIBLE_SUBTASKS;
  const visibleSubtasks = allSubtasks.slice(0, MAX_VISIBLE_SUBTASKS);

  return (
    <div className="absolute rounded-lg border border-graphite bg-obsidian shadow-md animate-fadeIn"
      style={{ left: node.x, top: node.y, width: node.w }}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-graphite/60 px-3 py-2.5">
        <div className={`h-2 w-2 shrink-0 rounded-full ${color.badge}`} />
        <p className="truncate font-inter text-xs font-[510] text-snow" title={node.label}>{node.label}</p>
      </div>

      {/* Subtask checklist (collapsed preview, max 3) */}
      {visibleSubtasks.length > 0 && (
        <ul className="px-3 py-2 space-y-1">
          {visibleSubtasks.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-fog">
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-graphite bg-charcoal">
                <span className="h-1.5 w-1.5 rounded-sm bg-fog/30" />
              </span>
              <span className="truncate">{s.name}</span>
            </li>
          ))}
        </ul>
      )}

      {/* "Lihat semua" → modal */}
      {hasMore && (
        <div className="border-t border-graphite/40 px-3 py-1.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] font-[510] text-indigo hover:text-indigo/80 transition-colors"
          >
            Lihat semua ({total}) <ChevronRight size={10} />
          </button>
        </div>
      )}
    </div>
  );
}
