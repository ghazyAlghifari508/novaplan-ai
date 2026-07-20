"use client";

import { memo } from "react";

interface ConnectionLinesProps {
  /** Number of feature columns laid out horizontally. */
  featureCount: number;
  /** Column width in px (matches FeatureCard width). */
  columnWidth: number;
  /** Horizontal gap between columns in px. */
  gap: number;
}

/**
 * SVG overlay drawing connector lines between feature columns.
 * ponytail: MVP draws simple vertical "spine" lines between adjacent feature
 * columns — visual cue of sequential flow. Cross-task dependency edges (dashed)
 * land later when node positions are persisted (PRD-05 "position saving later").
 */
export const ConnectionLines = memo(function ConnectionLines({
  featureCount,
  columnWidth,
  gap,
}: ConnectionLinesProps) {
  if (featureCount < 2) return null;

  const stepWidth = columnWidth + gap;
  const lines = [];
  // Draw a horizontal connector at mid-height between each adjacent column pair.
  for (let i = 0; i < featureCount - 1; i++) {
    const x1 = i * stepWidth + columnWidth;
    const x2 = (i + 1) * stepWidth;
    const midY = 40; // approx feature header height
    lines.push(
      <line
        key={`conn-${i}`}
        x1={x1}
        y1={midY}
        x2={x2}
        y2={midY}
        stroke="var(--color-graphite)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />,
    );
  }

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: featureCount * stepWidth, height: 80, overflow: "visible" }}
    >
      {lines}
    </svg>
  );
});
