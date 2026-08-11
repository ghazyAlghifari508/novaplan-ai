"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { Plan } from "@/types/database";

interface AcViewerProps {
	content: string | null;
	streamingContent?: string;
	isStreaming?: boolean;
	hasError?: boolean;
	projectName: string;
	plan?: Plan;
	className?: string;
}

/**
 * AC Viewer - mirrors prd-viewer.tsx pattern:
 * - Streaming: render raw markdown live
 * - Done: render raw markdown with heading-id injection for TOC scroll
 */
export const AcViewer = memo(function AcViewer({
	content,
	streamingContent,
	isStreaming = false,
	hasError = false,
	projectName: _projectName,
	plan: _plan = "free",
	className,
}: AcViewerProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	// Auto-scroll while streaming
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional re-scroll on token
	useEffect(() => {
		if (isStreaming && scrollRef.current) {
			const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
			if (scrollHeight - scrollTop - clientHeight < 150) {
				scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
			}
		}
	}, [streamingContent, isStreaming]);

	// Clean AI markdown wrapper artifacts (mirrors prd-viewer.ts)
	const cleanContent = useMemo(() => {
		if (!content) return "";
		let cleaned = content.replace(/<!--[\s\S]*?-->/g, "").trim();

		const startMatch = cleaned.match(/```(?:markdown|md)\s*\n/i);
		if (startMatch) {
			if (startMatch.index !== undefined && startMatch.index < 500) {
				const startIndex = startMatch.index + startMatch[0].length;
				const lastIndex = cleaned.lastIndexOf("```");
				cleaned =
					lastIndex > startIndex
						? cleaned.substring(startIndex, lastIndex)
						: cleaned.substring(startIndex);
			}
		} else {
			if (cleaned.startsWith("```\n")) {
				const lastIndex = cleaned.lastIndexOf("```");
				cleaned = lastIndex > 3 ? cleaned.substring(4, lastIndex) : cleaned;
			} else if (cleaned.startsWith("```")) {
				const lastIndex = cleaned.lastIndexOf("```");
				cleaned = lastIndex > 2 ? cleaned.substring(3, lastIndex) : cleaned;
			}
		}
		return cleaned.trim();
	}, [content]);

	const displayContent =
		isStreaming && streamingContent ? streamingContent : cleanContent;

	// Show typing placeholder while streaming but no content yet —
	// the AI server may take 30-60s before the first token arrives.
	// An empty article with a blinking cursor feels faster than a
	// full-page spinner because the "document is ready" framing
	// reassures the user that work is happening.
	if (isStreaming && !streamingContent) {
		return (
			<div ref={scrollRef} className={cn("h-full overflow-y-auto", className)}>
				<article className="prd-content mx-auto max-w-3xl px-8 pb-16 pt-8 text-mist">
					<div className="flex items-center gap-2 mb-6">
						<div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo border-t-transparent shrink-0" />
						<span className="text-sm font-[510] text-snow">
							AI sedang menyusun Acceptance Criteria...
						</span>
					</div>
					<div className="space-y-3">
						<div className="h-4 w-2/3 rounded bg-steel/60 animate-pulse" />
						<div className="h-3 w-full rounded bg-steel/60 animate-pulse" />
						<div className="h-3 w-5/6 rounded bg-steel/60 animate-pulse" />
						<div className="h-3 w-1/2 rounded bg-steel/60 animate-pulse" />
						<div className="mt-6 h-4 w-1/2 rounded bg-steel/60 animate-pulse" />
						<div className="h-3 w-full rounded bg-steel/60 animate-pulse" />
						<div className="h-3 w-4/5 rounded bg-steel/60 animate-pulse" />
					</div>
					<span className="inline-block w-0.5 h-4 bg-indigo animate-pulse mt-4" />
				</article>
			</div>
		);
	}

	// Show error/retry state when streaming ended with error and no content
	if (hasError && !displayContent) {
		return (
			<div ref={scrollRef} className={cn("h-full overflow-y-auto", className)}>
				<article className="prd-content mx-auto max-w-3xl px-8 pb-16 pt-8 text-mist">
					<div className="text-center py-12">
						<p className="text-crimson mb-4">Gagal generate AC</p>
						<p className="text-fog mb-6">
							Terjadi kesalahan saat menghubungi AI. Silakan coba lagi.
						</p>
						<button
							onClick={() => window.location.reload()}
							className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2"
						>
							<span>Coba Lagi</span>
						</button>
					</div>
				</article>
			</div>
		);
	}

	if (!displayContent) {
		return (
			<div className={cn("flex h-full items-center justify-center", className)}>
				<div className="text-center">
					<p className="text-fog">Belum ada Acceptance Criteria.</p>
					<p className="text-sm text-fog/60">
						AI sedang menyusun kriteria penerimaan...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div ref={scrollRef} className={cn("h-full overflow-y-auto", className)}>
			<article className="prd-content mx-auto max-w-3xl px-8 pb-16 pt-8 text-mist">
				<Markdown
					remarkPlugins={[remarkGfm]}
					rehypePlugins={[rehypeHighlight]}
					components={{
						h2: ({ children, ...props }) => {
							const text = String(children).replace(/<[^>]*>/g, "");
							const id = text.toLowerCase().replace(/[^\w]+/g, "-");
							return (
								<h2 id={id} {...props}>
									{children}
								</h2>
							);
						},
						h3: ({ children, ...props }) => {
							const text = String(children).replace(/<[^>]*>/g, "");
							const id = text.toLowerCase().replace(/[^\w]+/g, "-");
							return (
								<h3 id={id} {...props}>
									{children}
								</h3>
							);
						},
						h4: ({ children, ...props }) => {
							const text = String(children).replace(/<[^>]*>/g, "");
							const id = text.toLowerCase().replace(/[^\w]+/g, "-");
							return (
								<h4 id={id} {...props}>
									{children}
								</h4>
							);
						},
					}}
				>
					{displayContent}
				</Markdown>
			</article>
		</div>
	);
});
