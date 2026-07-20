"use client";

import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ponytail: route is source of truth, not projects.step.
// DB step lags actual navigation (e.g. user revisits /prd after reaching /ac).
// Route→step avoids stale-indicator bugs. Wire project.step later only to drive
// server-side redirects, never the indicator's active state.

export type FlowStep = "prd" | "ac" | "task";

const STEPS: { key: FlowStep; label: string }[] = [
  { key: "prd", label: "PRD" },
  { key: "ac", label: "AC" },
  { key: "task", label: "Task, Fitur & Sitemap" },
];

export function routeToStep(pathname: string): FlowStep {
  if (pathname.startsWith("/ac/")) return "ac";
  if (pathname.startsWith("/task/")) return "task";
  if (pathname.startsWith("/kanban/")) return "task"; // kanban = advanced task phase
  return "prd";
}

export function FlowStepNav() {
  const pathname = usePathname();
  const current = routeToStep(pathname);
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <ol
      aria-label="Flow step"
      className="hidden items-center gap-1.5 md:flex"
    >
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isActive = idx === currentIdx;

        return (
          <li
            key={step.key}
            className="flex items-center gap-1.5"
            aria-current={isActive ? "step" : undefined}
          >
            {idx > 0 && (
              <span
                aria-hidden
                className={cn(
                  "h-px w-4 transition-colors duration-300",
                  idx <= currentIdx ? "bg-indigo/60" : "bg-graphite"
                )}
              />
            )}
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-[510] transition-colors duration-300",
                  isCompleted && "bg-emerald text-charcoal",
                  isActive && "bg-indigo text-white",
                  !isCompleted && !isActive && "border border-graphite text-fog"
                )}
              >
                {isCompleted ? <Check size={11} strokeWidth={3} /> : idx + 1}
              </span>
              <span
                className={cn(
                  "font-inter text-xs font-normal transition-colors duration-300",
                  isActive ? "font-[510] text-snow" : "text-fog"
                )}
              >
                {step.label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
