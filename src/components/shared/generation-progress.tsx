"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface GenerationProgressProps {
	/** What is being generated, e.g. "Acceptance Criteria" */
	label: string;
	/** Real reasoning text streamed from the model's SSE `thinking` events. */
	thinkingText?: string;
	className?: string;
}

// Honest waiting state: spinner + elapsed time, and the model's actual
// reasoning stream when the upstream emits it. No fake step checklists.
export function GenerationProgress({
	label,
	thinkingText,
	className,
}: GenerationProgressProps) {
	const [elapsed, setElapsed] = useState(0);

	useEffect(() => {
		const t = setInterval(() => setElapsed((s) => s + 1), 1000);
		return () => clearInterval(t);
	}, []);

	const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

	return (
		<div className={cn("mx-auto max-w-3xl px-8 pb-16 pt-8", className)}>
			<div className="flex items-center gap-3">
				<div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-indigo border-t-transparent" />
				<span className="text-sm font-[510] text-snow">
					AI sedang menyusun {label}...
				</span>
				<span className="ml-auto font-mono text-xs text-fog/60" aria-live="off">
					{mmss}
				</span>
			</div>

			{thinkingText ? (
				<details className="mt-4 text-xs text-fog/60" open>
					<summary className="cursor-pointer select-none">
						Proses berpikir model
					</summary>
					<pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-fog/40 custom-scrollbar">
						{thinkingText}
					</pre>
				</details>
			) : (
				<p className="mt-3 text-xs text-fog/50">
					Model sedang memproses permintaan — dokumen akan muncul di sini saat
					streaming dimulai.
				</p>
			)}
		</div>
	);
}
