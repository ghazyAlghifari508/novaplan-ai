"use client";

import { useLocation } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { stepRank } from "@/lib/flow-progress";
import { cn } from "@/lib/utils";

// ponytail: pure step<->route logic extracted to @/lib/flow-step so server
// code + tests can use it without next/navigation. Re-export keeps existing
// `import { routeToStep } from "./flow-step-nav"` call sites working.
export { type FlowStep, routeToStep } from "@/lib/flow-step";

import type { FlowStep } from "@/lib/flow-step";
import { routeToStep } from "@/lib/flow-step";

export type StepId = FlowStep | "kanban";

const steps: Array<{ id: StepId; label: string; route: string }> = [
	{ id: "prd", label: "PRD", route: "/prd/$id" },
	{ id: "ac", label: "AC", route: "/ac/$id" },
	{ id: "task", label: "Task", route: "/task/$id" },
	{ id: "kanban", label: "Kanban", route: "/kanban/$id" },
];

function rankOf(id: StepId): number {
	// Kanban is distinct visual step beyond task (task=3, kanban=4)
	if (id === "kanban") return stepRank("task") + 1;
	return stepRank(id as FlowStep);
}

export function FlowStepNav(props?: { step?: FlowStep | string | null }) {
	const pathname = useLocation({ select: (l) => l.pathname });
	const isKanbanRoute = (pathname ?? "").startsWith("/kanban");
	// Honest: prefer real DB step when provided via prop, fallback to route-derived
	const currentStep = (props?.step as FlowStep) ?? routeToStep(pathname ?? "");
	let rank = stepRank(currentStep);
	// Question stage is not shown in stepper (steps start at PRD) — map question(0) → prd(1) so there is always a current
	if (rank === stepRank("question")) rank = stepRank("prd");

	return (
		<ol aria-label="Flow step" className="flex items-center gap-2 md:gap-2">
			{steps.map((s, idx) => {
				let state: "done" | "current" | "locked";
				if (s.id === "kanban") {
					if (isKanbanRoute) state = "current";
					else if (rank >= stepRank("task")) state = "done";
					else state = "locked";
				} else if (
					s.id === "task" &&
					isKanbanRoute &&
					rank >= stepRank("task")
				) {
					// When viewing kanban, task is done (kanban is the current view of task stage)
					state = "done";
				} else {
					const sRank = rankOf(s.id);
					state = sRank < rank ? "done" : sRank === rank ? "current" : "locked";
				}
				const isCompleted = state === "done";
				const isActive = state === "current";
				const isLocked = state === "locked";

				// Connector active when the current step is done/current, not locked
				const connectorActive = (() => {
					if (s.id === "kanban") {
						return rank >= stepRank("task") || isKanbanRoute;
					}
					return rankOf(s.id) <= rank;
				})();

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
									connectorActive ? "bg-indigo/60" : "bg-graphite",
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
