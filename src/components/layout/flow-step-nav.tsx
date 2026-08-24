"use client";

import { useLocation } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { stepRank } from "@/lib/flow-progress";

// ponytail: pure step<->route logic extracted to @/lib/flow-step so server
// code + tests can use it without next/navigation. Re-export keeps existing
// `import { routeToStep } from "./flow-step-nav"` call sites working.
export { type FlowStep, routeToStep } from "@/lib/flow-step";

import type { FlowStep } from "@/lib/flow-step";
import { routeToStep } from "@/lib/flow-step";

const steps: Array<{ id: FlowStep; label: string; route: string }> = [
	{ id: "prd", label: "PRD", route: "/prd/$id" },
	{ id: "ac", label: "AC", route: "/ac/$id" },
	{ id: "task", label: "Task", route: "/task/$id" },
	{ id: "kanban" as unknown as FlowStep, label: "Kanban", route: "/kanban/$id" },
];

function rankOf(id: FlowStep): number {
	// Kanban is view of task stage — same DB rank as task
	if ((id as string) === "kanban") return stepRank("task");
	return stepRank(id);
}

export function FlowStepNav(props?: { step?: FlowStep | string | null }) {
	const pathname = useLocation({ select: (l) => l.pathname });
	// Honest: prefer real DB step when provided via prop, fallback to route-derived
	const currentStep = (props?.step as FlowStep) ?? routeToStep(pathname ?? "");
	const rank = stepRank(currentStep);

	return (
		<ol aria-label="Flow step" className="flex items-center gap-2 md:gap-2">
			{steps.map((s, idx) => {
				const sRank = rankOf(s.id);
				const state =
					sRank < rank ? "done" : sRank === rank ? "current" : "locked";
				const isCompleted = state === "done";
				const isActive = state === "current";
				const isLocked = state === "locked";

				return (
					<li
						key={`${s.id}-${s.route}`}
						className="flex items-center gap-1.5"
						aria-current={isActive ? "step" : undefined}
					>
						{idx > 0 && (
							<span
								aria-hidden
								className={cn(
									"hidden h-px w-4 transition-colors duration-300 md:block",
									sRank <= rank ? "bg-indigo/60" : "bg-graphite",
								)}
							/>
						)}
						<span
							className={cn(
								"flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-[510] transition-colors duration-300",
								isCompleted && "bg-emerald text-charcoal",
								isActive && "bg-indigo text-white",
								isLocked && "border border-graphite text-fog",
							)}
						>
							{isCompleted ? <Check size={12} strokeWidth={3} /> : idx + 1}
						</span>
						<span
							className={cn(
								"hidden font-inter text-sm font-normal transition-colors duration-300 md:block",
								isActive ? "font-[510] text-snow" : "text-fog",
							)}
						>
							{s.label}
						</span>
					</li>
				);
			})}
		</ol>
	);
}
