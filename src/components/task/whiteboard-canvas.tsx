"use client";

import { memo, useCallback } from "react";
import { FeatureCard } from "./feature-card";
import { ConnectionLines } from "./connection-lines";
import { SitemapNode } from "./sitemap-node";
import { useCanvasZoom } from "@/hooks/use-canvas-zoom";
import { ZoomControls } from "./zoom-controls";
import type { TaskTree } from "@/lib/services/task-service";
import type { SitemapTree, SitemapPage } from "@/lib/services/sitemap-service";

const COLUMN_WIDTH = 320;
const COLUMN_GAP = 32;
const SITEMAP_CARD_W = 180;
const SITEMAP_CARD_H = 110;
const SITEMAP_LEVEL_GAP = 80;
const SITEMAP_SIBLING_GAP = 24;

type CanvasMode = "task" | "sitemap";

interface WhiteboardCanvasProps {
  mode?: CanvasMode;
  taskTree?: TaskTree | null;
  sitemapTree?: SitemapTree | null;
  isStreaming?: boolean;
  streamingContent?: string;
}

/**
 * Layout a sitemap page + its descendants, returning positioned nodes + edges.
 * ponytail: manual BFS-ish recursion. Computes subtree widths bottom-up so
 * parents center over their children. No dagre — fine for <50 pages.
 */
function layoutSitemap(
  page: SitemapPage,
  x: number,
  y: number,
  nodes: Array<{ page: SitemapPage; x: number; y: number }>,
  edges: Array<{ x1: number; y1: number; x2: number; y2: number }>,
  stack: string[] = [],
): number {
  // Cycle guard — circular AI output would otherwise infinite-loop the layout.
  const pathKey = page.path;
  if (stack.includes(pathKey)) return SITEMAP_CARD_W;

  // Place this node centered at x.
  nodes.push({ page, x, y });

  const childCount = page.children.length;
  if (childCount === 0) {
    return SITEMAP_CARD_W;
  }

  // Layout children left-to-right, return total subtree width.
  const childY = y + SITEMAP_CARD_H + SITEMAP_LEVEL_GAP;
  const childWidths = page.children.map(() => SITEMAP_CARD_W);
  const totalChildrenWidth = childWidths.reduce((a, b) => a + b, 0)
    + SITEMAP_SIBLING_GAP * (childCount - 1);

  let cursor = x - totalChildrenWidth / 2;
  const childStack = [...stack, pathKey];
  for (let i = 0; i < childCount; i++) {
    const childCx = cursor + childWidths[i] / 2;
    layoutSitemap(page.children[i], childCx, childY, nodes, edges, childStack);
    // Edge: parent bottom-center → child top-center
    edges.push({
      x1: x,
      y1: y + SITEMAP_CARD_H,
      x2: childCx,
      y2: childY,
    });
    cursor += childWidths[i] + SITEMAP_SIBLING_GAP;
  }

  return Math.max(SITEMAP_CARD_W, totalChildrenWidth);
}

function SitemapTree({ tree }: { tree: SitemapTree | null | undefined }) {
  if (!tree || tree.pages.length === 0) {
    return <p className="text-sm text-fog">Sitemap belum dibuat. Klik &quot;Generate Sitemap&quot;.</p>;
  }

  const nodes: Array<{ page: SitemapPage; x: number; y: number }> = [];
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  // Layout each root page; offset horizontally so multiple roots don't overlap.
  let xOffset = 0;
  for (const root of tree.pages) {
    const width = layoutSitemap(root, xOffset + 200, 40, nodes, edges);
    xOffset += width + SITEMAP_SIBLING_GAP * 2;
  }

  // Bounds for the SVG overlay + container width.
  const maxX = nodes.reduce((m, n) => Math.max(m, n.x + SITEMAP_CARD_W), 0);
  const maxY = nodes.reduce((m, n) => Math.max(m, n.y + SITEMAP_CARD_H), 0);

  return (
    <div className="relative" style={{ width: maxX + 80, height: maxY + 80 }}>
      <svg
        aria-hidden
        className="pointer-events-none absolute left-0 top-0"
        width={maxX + 80}
        height={maxY + 80}
        style={{ overflow: "visible" }}
      >
        {edges.map((e, i) => (
          <path
            key={`edge-${i}`}
            d={`M ${e.x1} ${e.y1} L ${e.x1} ${e.y1 + SITEMAP_LEVEL_GAP / 2} L ${e.x2} ${e.y1 + SITEMAP_LEVEL_GAP / 2} L ${e.x2} ${e.y2}`}
            fill="none"
            stroke="var(--color-graphite)"
            strokeWidth={1.5}
          />
        ))}
      </svg>
      {nodes.map((n, i) => (
        <div
          key={`${n.page.path}-${i}`}
          className="absolute"
          style={{ left: n.x - SITEMAP_CARD_W / 2, top: n.y }}
        >
          <SitemapNode page={n.page} />
        </div>
      ))}
    </div>
  );
}

/**
 * Whiteboard canvas — SHARED shell (PRD-05 Task Board + PRD-06 Sitemap).
 * CSS transform drives zoom/pan (GPU-accelerated); no canvas library.
 *
 * ponytail: `mode` defaults to "task" so existing PRD-05 callers are untouched.
 */
export const WhiteboardCanvas = memo(function WhiteboardCanvas({
  mode = "task",
  taskTree,
  sitemapTree,
  isStreaming = false,
  streamingContent = "",
}: WhiteboardCanvasProps) {
  const { zoom, pan, zoomIn, zoomOut, resetZoom, startPan, updatePan, endPan, nudgePan } = useCanvasZoom();

  const features = taskTree?.features ?? [];
  const sitemapPages = sitemapTree?.pages ?? [];
  const isEmpty = mode === "task" ? features.length === 0 : sitemapPages.length === 0;
  const canvasWidth = mode === "task"
    ? features.length * (COLUMN_WIDTH + COLUMN_GAP)
    : Math.max(sitemapPages.length * 220, 600);

  const loadingLabel = mode === "task" ? "Menyusun task tree..." : "Menyusun sitemap...";
  const emptyLabel = mode === "task"
    ? "Task tree belum dibuat. Klik \"Generate Task\"."
    : "Sitemap belum dibuat. Klik \"Generate Sitemap\".";

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      nudgePan(e.key, 40);
    }
  }, [nudgePan]);

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
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={mode === "task" ? "Kanvas diagram task" : "Kanvas sitemap"}
    >
      {isStreaming && isEmpty ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-indigo border-t-transparent" />
            <p className="text-sm text-fog">{loadingLabel}</p>
            {streamingContent && (
              <pre className="mt-2 max-h-40 overflow-auto text-left text-[10px] text-fog/50">
                {streamingContent.slice(-200)}
              </pre>
            )}
          </div>
        </div>
      ) : isEmpty ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-fog">{emptyLabel}</p>
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
            {mode === "task" ? (
              <>
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
              </>
            ) : (
              <div className="p-8">
                <SitemapTree tree={sitemapTree} />
              </div>
            )}
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
