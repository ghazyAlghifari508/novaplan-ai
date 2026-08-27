"use client";

import { Link, useLocation } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { stepRank } from "@/lib/flow-progress";
import { type FlowStep, routeToStep, stepToRoute } from "@/lib/flow-step";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store";

// ponytail: pure step<->route logic extracted to @/lib/flow-step so server
// code + tests can use it without next/navigation. Re-export keeps existing
// `import { routeToStep } from "./flow-step-nav"` call sites working.
export { type FlowStep, routeToStep } from "@/lib/flow-step";

export type StepId = FlowStep;

const STEPS: Array<{ id: FlowStep; label: string }> = [
	{ id: "question", label: "Question" },
	{ id: "prd", label: "PRD" },
	{ id: "ac", label: "AC" },
	{ id: "task", label: "Task" },
];

export function FlowStepNav(props?: {
	step?: FlowStep | string | null;
	taskStatus?: string | null;
}) {
	const pathname = useLocation({ select: (l) => l.pathname });
	const isKanbanRoute = (pathname ?? "").startsWith("/kanban");
	const isTaskGenerated = useChatStore((s) => s.isTaskGenerated);
	const currentRouteStep = routeToStep(pathname ?? "");
	const routeRank = stepRank(currentRouteStep);
	const dbRank = stepRank(props?.step as FlowStep);

	const isTaskDone =
		isKanbanRoute || isTaskGenerated || props?.taskStatus === "completed";

	// Extract project id from URL (e.g. /prd/123 -> 123)
	const projectId = (pathname ?? "").split("/")[2];

	return (
		<ol aria-label="Flow step" className="flex items-center gap-1.5 md:gap-2">
			{STEPS.map((s, idx) => {
				const isCurrentRoute = s.id === currentRouteStep;

				const isCompleted =
					s.id === "task"
						? isTaskDone
						: !isCurrentRoute &&
							(routeRank > idx || (props?.step ? dbRank > idx : false));

				const isActive = isCurrentRoute && !isCompleted;
				const isLocked = !isCompleted && !isActive;

				const connectorActive =
					idx <= routeRank || (props?.step ? idx <= dbRank : false);

				const stepContent = (
					<div
						className={cn(
							"flex items-center gap-1.5",
							(isCompleted || isActive) && projectId
								? "cursor-pointer"
								: "cursor-default",
						)}
					>
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
								"hidden font-inter text-sm transition-colors duration-300 md:block",
								isActive
									? "font-[510] text-snow"
									: isCompleted
										? "font-normal text-snow hover:text-mist"
										: "font-normal text-fog",
							)}
						>
							{s.label}
						</span>
					</div>
				);

				return (
					<li
						key={s.id}
						className="flex items-center gap-1.5 md:gap-2"
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
						{projectId && (isCompleted || isActive) ? (
							<Link
								to={stepToRoute(s.id, projectId)}
								className="transition-opacity hover:opacity-90 focus:outline-none"
							>
								{stepContent}
							</Link>
						) : (
							stepContent
						)}
					</li>
				);
			})}
		</ol>
	);
}
