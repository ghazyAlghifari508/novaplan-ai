"use client";

import { memo } from "react";
import { FeatureCard } from "./feature-card";
import { ConnectionLines } from "./connection-lines";
import { useCanvasZoom } from "@/hooks/use-canvas-zoom";
import { ZoomControls } from "./zoom-controls";
import type { TaskTree } from "@/lib/services/task-service";

const COLUMN_WIDTH = 320;
const COLUMN_GAP = 32;

interface WhiteboardCanvasProps {
  taskTree: TaskTree | null;
  isStreaming?: boolean;
  streamingContent?: string;
}

/**
 * Whiteboard canvas — SHARED shell (PRD-05 Task Board + PRD-06 Sitemap).
 * Renders feature columns with auto top-down layout, zoom/pan, and connector
 * overlay. CSS transform drives zoom/pan (GPU-accelerated); no canvas library.
 *
 * ponytail: auto-layout = horizontal feature columns, vertical task stack.
 * Drag-to-reposition nodes is out of scope (position persistence is a later pass).
 */
export const WhiteboardCanvas = memo(function WhiteboardCanvas({
  taskTree,
  isStreaming = false,
  streamingContent = "",
}: WhiteboardCanvasProps) {
  const { zoom, pan, zoomIn, zoomOut, resetZoom, startPan, updatePan, endPan, nudgePan } = useCanvasZoom();

  const features = taskTree?.features ?? [];
  const canvasWidth = features.length * (COLUMN_WIDTH + COLUMN_GAP);

  return (
    <div
      className="relative h-full w-full touch-none overflow-hidden bg-onyx outline-none focus-visible:ring-2 focus-visible:ring-indigo/40"
      style={{
        backgroundImage: "radial-gradient(var(--color-graphite) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
      onPointerDown={startPan}
      onPointerMove={updatePan}
      onPointerUp={endPan}
      onPointerLeave={endPan}
      onKeyDown={(e) => {
        const step = 40;
        if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
        }
        // Reuse the pan hook's delta path via synthetic mouse events is overkill;
        // arrow keys nudge via a direct setState through a small closure.
        nudgePan(e.key, step);
      }}
      tabIndex={0}
      role="region"
      aria-label="Kanvas diagram task"
    >
      {isStreaming && !features.length ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-indigo border-t-transparent" />
            <p className="text-sm text-fog">Menyusun task tree...</p>
            {streamingContent && (
              <pre className="mt-2 max-h-40 overflow-auto text-left text-[10px] text-fog/50">
                {streamingContent.slice(-200)}
              </pre>
            )}
          </div>
        </div>
      ) : features.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-fog">Task tree belum dibuat. Klik &quot;Generate Task&quot;.</p>
        </div>
      ) : (
        <>
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: canvasWidth,
              transition: "transform 80ms ease-out",
            }}
          >
            <ConnectionLines
              featureCount={features.length}
              columnWidth={COLUMN_WIDTH}
              gap={COLUMN_GAP}
            />
            <div className="flex gap-8 p-8">
              {features.map((feature, idx) => (
                <FeatureCard
                  key={`${feature.name}-${idx}`}
                  name={feature.name}
                  tasks={feature.tasks}
                  colorIndex={idx}
                />
              ))}
            </div>
          </div>

          <ZoomControls
            zoom={zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onReset={resetZoom}
            className="absolute bottom-4 right-4"
          />
        </>
      )}
    </div>
  );
});
