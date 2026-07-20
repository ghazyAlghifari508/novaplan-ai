"use client";

import { memo } from "react";
import { TaskNode } from "./task-node";

interface FeatureCardProps {
  name: string;
  tasks: Array<{
    name: string;
    description: string;
    subtasks: Array<{ name: string; description: string }>;
  }>;
  colorIndex: number;
}

// Sequential palette — deterministic per feature order.
const PALETTE = [
  { bar: "bg-indigo", text: "text-indigo" },
  { bar: "bg-emerald", text: "text-emerald" },
  { bar: "bg-amber-500", text: "text-amber-500" },
  { bar: "bg-crimson", text: "text-crimson" },
  { bar: "bg-sky-500", text: "text-sky-500" },
  { bar: "bg-fuchsia-500", text: "text-fuchsia-500" },
];

export function featureColor(colorIndex: number) {
  return PALETTE[colorIndex % PALETTE.length];
}

/**
 * Feature group card — left color bar, feature name, nested task cards.
 * Width fixed for deterministic auto-layout columns.
 */
export const FeatureCard = memo(function FeatureCard({ name, tasks, colorIndex }: FeatureCardProps) {
  const color = featureColor(colorIndex);

  return (
    <div className="w-[320px] overflow-hidden rounded-lg border border-graphite bg-obsidian shadow-md">
      <div className="flex items-stretch">
        <div className={`w-1 shrink-0 ${color.bar}`} aria-hidden />
        <div className="min-w-0 flex-1 p-4">
          <h3 className="mb-3 truncate font-inter text-base font-[510] text-snow" title={name}>
            {name}
          </h3>
          <div className="space-y-2">
            {tasks.map((task, idx) => (
              <TaskNode
                key={`${task.name}-${idx}`}
                name={task.name}
                description={task.description}
                subtasks={task.subtasks}
              />
            ))}
            {tasks.length === 0 && (
              <p className="text-xs italic text-fog">Belum ada task</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
