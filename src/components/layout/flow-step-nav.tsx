"use client";

import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store";
// ponytail: pure step<->route logic extracted to @/lib/flow-step so server
// code + tests can use it without next/navigation. Re-export keeps existing
// `import { routeToStep } from "./flow-step-nav"` call sites working.
export { routeToStep, type FlowStep } from "@/lib/flow-step";
import type { FlowStep } from "@/lib/flow-step";
import { routeToStep } from "@/lib/flow-step";

const STEPS: { key: FlowStep; label: string }[] = [
  { key: "question", label: "Question" },
  { key: "prd", label: "PRD" },
  { key: "ac", label: "AC" },
  { key: "task", label: "Task" },
];

export function FlowStepNav() {
  const pathname = usePathname();
  const current = routeToStep(pathname ?? "");
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  const isTaskGenerated = useChatStore((s) => s.isTaskGenerated);

  return (
    <>
      <ol
        aria-label="Flow step"
        className="hidden items-center gap-2 md:flex"
      >
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIdx || (step.key === "task" && isTaskGenerated);
          const isActive = idx === currentIdx && !isCompleted;

          return (
            <li
              key={step.key}
              className="flex items-center gap-2"
              aria-current={isActive ? "step" : undefined}
            >
              {idx > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "h-px w-5 transition-colors duration-300",
                    idx <= currentIdx ? "bg-indigo/60" : "bg-graphite"
                  )}
                />
              )}
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-[510] transition-colors duration-300",
                    isCompleted && "bg-emerald text-charcoal",
                    isActive && "bg-indigo text-white",
                    !isCompleted && !isActive && "border border-graphite text-fog"
                  )}
                >
                  {isCompleted ? <Check size={12} strokeWidth={3} /> : idx + 1}
                </span>
                <span
                  className={cn(
                    "font-inter text-sm font-normal transition-colors duration-300",
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

      {/* Mobile: abbreviated step dots */}
      <ol
        aria-label="Flow step (mobile)"
        className="flex items-center gap-1.5 md:hidden"
      >
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIdx || (step.key === "task" && isTaskGenerated);
          const isActive = idx === currentIdx && !isCompleted;

          return (
            <li key={step.key} className="flex items-center gap-1" aria-current={isActive ? "step" : undefined}>
              {idx > 0 && <span aria-hidden className="h-px w-1.5 bg-graphite" />}
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-[510] transition-colors",
                  isCompleted && "bg-emerald text-charcoal",
                  isActive && "bg-indigo text-white",
                  !isCompleted && !isActive && "border border-graphite text-fog"
                )}
              >
                {isCompleted ? <Check size={8} strokeWidth={3} /> : idx + 1}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}
