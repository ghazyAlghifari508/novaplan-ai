"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface GenerationProgressProps {
	/** What is being generated, e.g. "Acceptance Criteria" */
	label: string;
	/**
	 * false = pre-stream: plain loading (spinner + skeleton).
	 * true = waiting on the model before first token: rotating step list.
	 * Once real content streams, callers swap to content.
	 */
	thinking?: boolean;
	className?: string;
}

const THINKING_STEPS = [
	"Menganalisis dokumen...",
	"Menyusun struktur output...",
	"Merinci kebutuhan fungsional...",
	"Memvalidasi konsistensi...",
	"Menyempurnakan detail...",
];

// ponytail: fixed 2.2s rotation — no AI-progress signal exists server-side
// (reasoning models stay silent until first token), so steps are cosmetic.
export function GenerationProgress({
	label,
	thinking = false,
	className,
}: GenerationProgressProps) {
	const [stepIndex, setStepIndex] = useState(0);

	useEffect(() => {
		if (!thinking) return;
		const t = setInterval(
			() => setStepIndex((i) => (i + 1) % THINKING_STEPS.length),
			2200,
		);
		return () => clearInterval(t);
	}, [thinking]);

	return (
		<div className={cn("mx-auto max-w-3xl px-8 pb-16 pt-8", className)}>
			<div className="mb-6 flex items-center gap-3">
				<div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-indigo border-t-transparent" />
				<span className="text-sm font-[510] text-snow">
					AI sedang menyusun {label}...
				</span>
			</div>

			{thinking && (
				<ul className="mb-6 space-y-2" aria-live="polite">
					{THINKING_STEPS.map((step, i) => {
						const state =
							i < stepIndex ? "done" : i === stepIndex ? "active" : "todo";
						return (
							<li
								key={step}
								className={cn(
									"flex items-center gap-2.5 text-sm transition-opacity duration-500",
									state === "active" && "opacity-100 text-snow",
									state === "done" && "opacity-60 text-fog/70",
									state === "todo" && "opacity-40 text-fog/40",
								)}
							>
								<span
									className={cn(
										"flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px]",
										state === "done" && "border-emerald-400 bg-emerald-400/20",
										state === "active" &&
											"animate-pulse border-indigo bg-indigo/20",
										state === "todo" && "border-fog/30",
									)}
								>
									{state === "done" ? "✓" : ""}
								</span>
								{step}
							</li>
						);
					})}
				</ul>
			)}

			<div className="space-y-3">
				<div className="h-4 w-2/3 animate-pulse rounded bg-steel/60" />
				<div className="h-3 w-full animate-pulse rounded bg-steel/60" />
				<div className="h-3 w-5/6 animate-pulse rounded bg-steel/60" />
				<div className="h-3 w-1/2 animate-pulse rounded bg-steel/60" />
				<div className="mt-6 h-4 w-1/2 animate-pulse rounded bg-steel/60" />
				<div className="h-3 w-full animate-pulse rounded bg-steel/60" />
				<div className="h-3 w-4/5 animate-pulse rounded bg-steel/60" />
			</div>
		</div>
	);
}
