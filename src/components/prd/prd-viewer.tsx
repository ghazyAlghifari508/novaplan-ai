"use client";

import {
	lazy,
	memo,
	Suspense,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { PrdDiffViewer } from "./prd-diff-viewer";
import { TableOfContents } from "./table-of-contents";

// ponytail: lazy-load Mermaid so the ~2-3MB mermaid library (layout engines,
// flowchart/sequence/class parsers) stays out of the main PRD chunk. Only
// fetched when a PRD actually contains a mermaid code fence. autoCodeSplitting
// handles route-level split; this handles component-level split within a route.
const Mermaid = lazy(() =>
	import("./mermaid").then((m) => ({ default: m.Mermaid })),
);

import { usePanelResize } from "@/hooks/use-panel-resize";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store";
import type { Plan } from "@/types/database";
import { VersionHistory } from "./version-history";

// ponytail: extracted to module scope so react-markdown re-parses only once
// (not on every parent render). Pure functions — no useMemo needed.
const markdownComponents: Components = {
	h2: ({ children, ...props }) => {
		const text = String(children).replace(/<[^>]*>/g, "");
		const id = text.toLowerCase().replace(/[^\w]+/g, "-");
		return <h2 id={id} {...props}>{children}</h2>;
	},
	h3: ({ children, ...props }) => {
		const text = String(children).replace(/<[^>]*>/g, "");
		const id = text.toLowerCase().replace(/[^\w]+/g, "-");
		return <h3 id={id} {...props}>{children}</h3>;
	},
	h4: ({ children, ...props }) => {
		const text = String(children).replace(/<[^>]*>/g, "");
		const id = text.toLowerCase().replace(/[^\w]+/g, "-");
		return <h4 id={id} {...props}>{children}</h4>;
	},
	code: ({
		className,
		children,
		...props
	}) => {
		const match = /language-(\w+)/.exec(className || "");
		if (match && match[1] === "mermaid") {
			return (
				<Suspense fallback={<div className="animate-pulse bg-black/5 dark:bg-white/5 h-32 rounded-lg my-6" />}>
					<Mermaid chart={String(children).replace(/\n$/, "")} />
				</Suspense>
			);
		}
		return <code className={className} {...props}>{children}</code>;
	},
};

interface PrdVersion {
	id: string;
	version: number;
	content: string;
	change_summary: string | null;
	created_at: string;
}

interface PrdViewerProps {
	content: string;
	projectName: string;
	className?: string;
	plan?: Plan;
	versions?: PrdVersion[];
	currentVersion?: number;
	onSelectVersion?: (content: string, version: number) => void;
	projectId?: string;
}

export const PrdViewer = memo(function PrdViewer({
	content,
	projectName,
	className,
	plan = "free",
	versions,
	currentVersion,
	onSelectVersion,
	projectId,
}: PrdViewerProps) {
	const { leftWidth, onStartDragLeft, isDraggingLeft } = usePanelResize();
	const scrollRef = useRef<HTMLDivElement>(null);
	const [activeTab, setActiveTab] = useState<"preview" | "diff">("preview");
	const [oldVer, setOldVer] = useState<number | undefined>(undefined);
	const [isExporting, setIsExporting] = useState(false);
	const showToast = useUIStore((s) => s.showToast);

	// Auto-scroll logic when new content arrives
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional re-scroll on content change
	useEffect(() => {
		if (scrollRef.current) {
			const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
			// If we're within 150px of the bottom, auto scroll down to follow new content
			const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
			if (isNearBottom) {
				scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
			}
		}
	}, [content]);

	// Membersihkan sisa tag markdown (misal ```markdown di awal dan ``` di akhir)
	// yang sering kali ditambahkan secara otomatis oleh AI.
	// ponytail: memoize by `content` so we don't re-run the regex chain on every
	// render delta (PRD streaming can produce 200+ renders).
	const cleanContent = useMemo(() => {
		let cleaned = content.replace(/<!--[\s\S]*?-->/g, "").trim();

		const startMatch = cleaned.match(/```(?:markdown|md)\s*\n/i);

		if (startMatch) {
			if (startMatch.index !== undefined && startMatch.index < 500) {
				const startIndex = startMatch.index + startMatch[0].length;
				const lastIndex = cleaned.lastIndexOf("```");

				if (lastIndex > startIndex) {
					cleaned = cleaned.substring(startIndex, lastIndex);
				} else {
					cleaned = cleaned.substring(startIndex);
				}
			}
		} else {
			if (cleaned.startsWith("```\n")) {
				const lastIndex = cleaned.lastIndexOf("```");
				if (lastIndex > 3) {
					cleaned = cleaned.substring(4, lastIndex);
				}
			} else if (cleaned.startsWith("```")) {
				const lastIndex = cleaned.lastIndexOf("```");
				if (lastIndex > 2) {
					cleaned = cleaned.substring(3, lastIndex);
				}
			}
		}
		// Strip ===DONE=== marker that AI outputs as completion signal.
		// Stop sequence should catch it, but sometimes it leaks into saved content.
		cleaned = cleaned.replace(/={3,}DONE={3,}/gi, "").trim();

		return cleaned.trim();
	}, [content]);

	return (
		<div className={cn("flex h-full", className)}>
			<aside
				style={{ width: `${leftWidth}px`, background: "var(--bg-page)" }}
				className={cn(
					"relative hidden h-full shrink-0 overflow-y-auto overflow-x-hidden border-r border-graphite bg-onyx p-4 md:block",
					!isDraggingLeft && "transition-[width] duration-300",
				)}
			>
				<TableOfContents content={content} />
				{/* Drag handle */}
				<div
					className="absolute right-[-4px] top-0 z-10 h-full w-2 cursor-col-resize transition-colors hover:bg-indigo/20"
					onMouseDown={onStartDragLeft}
				/>
			</aside>

			{/* Content area: VersionHistory header + tabs + scrollable content */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Version History header - only spans content area, not TOC */}
				{versions && versions.length > 1 && (
					<div className="shrink-0 border-b border-graphite bg-charcoal/40 px-4 py-2">
						<div className="mx-auto max-w-3xl flex justify-end">
							<VersionHistory
								versions={versions}
								currentVersion={currentVersion || 1}
								onSelectVersion={onSelectVersion || (() => {})}
								plan={plan}
							/>
						</div>
					</div>
				)}

				{/* Tabs: Preview | Diff */}
				<div className="shrink-0 flex items-center gap-2 border-b border-graphite bg-charcoal/20 px-4 py-2">
					<button
						type="button"
						onClick={() => setActiveTab("preview")}
						className={cn(
							"rounded px-3 py-1 text-xs font-medium transition-colors",
							activeTab === "preview"
								? "bg-indigo text-white"
								: "bg-white/5 text-fog hover:bg-white/10 hover:text-snow",
						)}
					>
						Pratinjau
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("diff")}
						className={cn(
							"rounded px-3 py-1 text-xs font-medium transition-colors",
							activeTab === "diff"
								? "bg-indigo text-white"
								: "bg-white/5 text-fog hover:bg-white/10 hover:text-snow",
						)}
					>
						Diff
					</button>
					{activeTab === "diff" && versions && versions.length > 1 && (
						<select
							value={oldVer ?? ""}
							onChange={(e) => setOldVer(e.target.value ? Number(e.target.value) : undefined)}
							className="ml-2 rounded border border-graphite bg-onyx px-2 py-1 text-xs text-snow"
							aria-label="Pilih versi lama untuk compare"
						>
							<option value="">Pilih versi lama</option>
							{versions
								.filter((v) => v.version !== currentVersion)
								.map((v) => (
									<option key={v.id} value={v.version}>
										v{v.version}
									</option>
								))}
						</select>
					)}
					{projectId && (
						<button
							type="button"
							disabled={isExporting}
							onClick={async () => {
								if (isExporting) return;
								setIsExporting(true);
								try {
									const res = await fetch("/api/export/pdf", {
										method: "POST",
										headers: { "Content-Type": "application/json" },
										body: JSON.stringify({ projectId }),
									});
									if (!res.ok) {
										showToast("Gagal mengekspor PDF", "error");
										return;
									}
									const blob = await res.blob();
									const url = URL.createObjectURL(blob);
									const safeName = (projectName || "project")
										.replace(/[^a-zA-Z0-9_-]/g, "-")
										.replace(/-+/g, "-")
										.toLowerCase();
									const a = document.createElement("a");
									a.href = url;
									a.download = `${safeName}.pdf`;
									a.click();
									setTimeout(() => URL.revokeObjectURL(url), 1000);
								} catch {
									showToast("Gagal mengekspor PDF", "error");
								} finally {
									setIsExporting(false);
								}
							}}
							className="ml-auto rounded bg-indigo px-3 py-1 text-xs font-medium text-white hover:bg-indigo/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isExporting ? "Mengekspor..." : "Export PDF"}
						</button>
					)}
				</div>

				<div
					ref={scrollRef}
					className="flex-1 overflow-y-auto relative scroll-smooth"
				>
					{activeTab === "diff" ? (
						<div className="mx-auto max-w-3xl px-4 py-4">
							<PrdDiffViewer
								oldContent={versions?.find((v) => v.version === oldVer)?.content ?? ""}
								newContent={content}
							/>
						</div>
					) : (
						<article className="prd-content mx-auto max-w-3xl px-8 pb-16 pt-8 text-mist">
							<Markdown
								remarkPlugins={[remarkGfm]}
								rehypePlugins={[rehypeHighlight]}
								components={markdownComponents}
							>
								{cleanContent}
							</Markdown>
						</article>
					)}
				</div>
			</div>
		</div>
	);
});
