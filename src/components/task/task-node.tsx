"use client";

import { memo } from "react";
import { Circle, Wrench } from "lucide-react";

interface TaskNodeProps {
  name: string;
  description: string;
  subtasks: Array<{ name: string; description: string }>;
}

/**
 * Task card rendered inside a FeatureCard.
 * Shows task name, description, and its subtask checklist.
 */
export const TaskNode = memo(function TaskNode({ name, description, subtasks }: TaskNodeProps) {
  return (
    <div className="rounded-md border border-graphite bg-charcoal p-3">
      <div className="flex items-start gap-2">
        <Wrench size={14} className="mt-0.5 shrink-0 text-fog" />
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-inter text-sm font-[510] text-snow">{name}</h4>
          {description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-fog">{description}</p>
          )}
        </div>
      </div>

      {subtasks.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-graphite/60 pt-2">
          {subtasks.map((subtask, idx) => (
            <li key={`${subtask.name}-${idx}`} className="flex items-start gap-2 text-xs text-snow/80">
              <Circle size={10} className="mt-1 shrink-0 text-fog/70" />
              <span className="truncate" title={subtask.description || subtask.name}>
                {subtask.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
