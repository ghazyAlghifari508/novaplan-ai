"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";
import { ChatPanel } from "@/components/chat";
import { usePanelResize } from "@/hooks/use-panel-resize";
import { cn } from "@/lib/utils";
import { useChatStore, useUIStore } from "@/store";
import type { Plan, PrdVersion } from "@/types/database";
import { PrdViewer } from "./prd-viewer";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface PrdDetailProps {
	projectId?: string;
	projectName?: string;
	latestVersion?: PrdVersion;
	allVersions?: PrdVersion[];
	conversationId?: string;
	isChatOpen?: boolean;
	plan?: Plan;
	revisionLimit?: number;
	initialMessages?: Array<{
		id: string;
		role: string;
		content: string;
		created_at: string;
	}>;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function PrdDetail({
	projectId,
	projectName,
	latestVersion,
	allVersions = [],
	conversationId,
	isChatOpen: _initialChatOpen = false,
	plan = "free",
	revisionLimit: _revisionLimit,
	initialMessages = [],
}: PrdDetailProps) {
	// ── State ──
	const [currentContent, setCurrentContent] = useState(
		latestVersion?.content || "",
	);
	const [selectedVersionNum, setSelectedVersionNum] = useState(
		latestVersion?.version || 1,
	);
	const [activeTab, setActiveTab] = useState<"doc" | "chat">("doc");
	// ponytail: versions list must be client-refreshable after revision - server-rendered
	// allVersions stays stale until next page load. Track locally so version history
	// appears immediately after revision without requiring a full page refresh.
	const [versions, setVersions] = useState(allVersions);
	const isChatOpen = useUIStore((s) => s.isChatPanelOpen);
	const [isStepLoading, setIsStepLoading] = useState(false);

	// ── Hooks ──
	const { rightWidth, onStartDragRight, isDraggingRight } = usePanelResize();
	const router = useRouter();
	const [, startTransition] = useTransition();
	const {
		isGeneratingPRD,
		streamingPRDContent,
		setGeneratingPRD,
		setStreamingPRDContent,
		setMessages,
		creditsExhausted: _creditsExhausted,
	} = useChatStore();
	const showToast = useUIStore((s) => s.showToast);

	// ── Typewriter reveal (generation only) ──
	// ponytail: 9router reasoning models emit no deltas during their long thinking
	// phase, then burst the whole document in <2s — PrdViewer renders it
	// "instantly", so the typing animation never appears. Reveal the received PRD
	// progressively (~50 chars/25ms) while generating so it looks like the AI is
	// typing. Cosmetic only: the underlying streamingPRDContent/currentContent
	// stays whole, so the saved document is never truncated.
	const [revealChars, setRevealChars] = useState<number | null>(null);
	const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (!isGeneratingPRD) {
			setRevealChars(null);
			if (revealTimer.current) clearTimeout(revealTimer.current);
			return;
		}
		setRevealChars(0);
		const tick = () => {
			setRevealChars((prev) => (prev === null ? null : prev + 50));
			revealTimer.current = setTimeout(tick, 25);
		};
		revealTimer.current = setTimeout(tick, 25);
		return () => {
			if (revealTimer.current) clearTimeout(revealTimer.current);
		};
	}, [isGeneratingPRD]);

	const streamingForView = useMemo(() => {
		if (!streamingPRDContent) return streamingPRDContent;
		if (revealChars === null || revealChars >= streamingPRDContent.length)
			return streamingPRDContent;
		return streamingPRDContent.slice(0, revealChars);
	}, [streamingPRDContent, revealChars]);

	// ── Effects ──

	// Sync chat messages - always set messages when initialMessages change
	// (survives refresh by loading from DB server-side).
	useEffect(() => {
		const store = useChatStore.getState();
		const isDifferentProject = store.activeProjectId !== (projectId || null);
		if (isDifferentProject) {
			store.setActiveProject(projectId || null);
		}
		if (initialMessages && initialMessages.length > 0) {
			setMessages(
				initialMessages.map((m) => ({
					id: m.id,
					role: m.role as "user" | "assistant" | "system",
					content: m.content,
					timestamp: new Date(m.created_at).getTime(),
				})),
			);
		} else if (isDifferentProject) {
			setMessages([]);
		}
	}, [projectId, initialMessages, setMessages]);

	// Sync content when latestVersion updates
	useEffect(() => {
		if (latestVersion) setCurrentContent(latestVersion.content);
	}, [latestVersion]);

	// Clear streaming state when mounted with saved PRD, and when navigating
	// between projects so stale Zustand globals from a prior streaming session
	// don't render a false generation state.
	useEffect(() => {
		const store = useChatStore.getState();
		const isDifferentProject = projectId && store.activeProjectId !== projectId;
		if (projectId && (latestVersion?.content || isDifferentProject)) {
			setGeneratingPRD(false);
			setStreamingPRDContent("");
		} else if (!projectId) {
			setGeneratingPRD(false);
			setStreamingPRDContent("");
		}
	}, [projectId, latestVersion, setGeneratingPRD, setStreamingPRDContent]);

	// ── Handlers ──

	// ponytail: re-fetch versions list client-side so version history updates
	// immediately after revision without full page refresh
	const refreshVersions = useCallback(async (): Promise<PrdVersion[]> => {
		if (!projectId) return [];
		try {
			const res = await fetch(`/api/projects/${projectId}/versions`);
			if (res.ok) {
				const data = await res.json();
				setVersions(data);
				return data;
			}
		} catch (err) {
			console.error("Failed to refresh versions:", err);
		}
		return [];
	}, [projectId]);

	const handleVersionSelect = (content: string, version: number) => {
		setCurrentContent(content);
		setSelectedVersionNum(version);
	};

	// ponytail: after revision completes, update content, refresh versions list,
	// and jump selectedVersionNum to the new version - otherwise the Version
	// History label stays pinned to whatever version was current on page load.
	const handlePrdRevised = useCallback(
		async (content: string) => {
			setCurrentContent(content);
			const refreshed = await refreshVersions();
			if (refreshed.length > 0) {
				setSelectedVersionNum(Math.max(...refreshed.map((v) => v.version)));
			}
		},
		[refreshVersions],
	);

	const handleProjectCreated = (newProjectId: string) => {
		startTransition(() => {
			router.push(`/prd/${newProjectId}`);
		});
	};

	const toggleChat = useUIStore((s) => s.toggleChatPanel);

	const _handleStepAc = async () => {
		if (!projectId || isStepLoading) return;
		setIsStepLoading(true);
		try {
			const res = await fetch(`/api/projects/${projectId}/step`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ step: "ac" }),
			});
			if (!res.ok) throw new Error("Gagal memperbarui tahap proyek");
			startTransition(() => {
				router.push(`/ac/${projectId}`);
			});
		} catch (err) {
			console.error("Step to AC failed:", err);
			showToast("Gagal lanjut ke Acceptance Criteria.", "error");
		} finally {
			setIsStepLoading(false);
		}
	};

	// ── Render ──

	return (
		<div className="flex h-dvh flex-col overflow-hidden bg-onyx text-snow">
			{/* ═══════════ Mobile Tab Toggle (<md) ═══════════ */}
			<div className="flex shrink-0 border-b border-graphite bg-charcoal md:hidden">
				<button
					onClick={() => setActiveTab("doc")}
					className={cn(
						"flex-1 py-2.5 text-center text-sm font-[510] transition-colors border-b-2",
						activeTab === "doc"
							? "border-indigo text-snow bg-white/5"
							: "border-transparent text-fog hover:text-snow",
					)}
				>
					Dokumen
				</button>
				<button
					onClick={() => setActiveTab("chat")}
					className={cn(
						"flex-1 py-2.5 text-center text-sm font-[510] transition-colors border-b-2",
						activeTab === "chat"
							? "border-indigo text-snow bg-white/5"
							: "border-transparent text-fog hover:text-snow",
					)}
				>
					Chat
				</button>
			</div>

			<div className="flex flex-1 overflow-hidden">
				{/* ═══════════ Center Panel (Document View) ═══════════ */}
				<div
					className={cn(
						"flex flex-1 flex-col overflow-hidden min-w-0",
						activeTab !== "doc" && "hidden md:flex",
					)}
					style={{ background: "var(--bg-page)" }}
				>
					{/* Default: PRD content (streaming or saved) */}
					<div className="flex flex-1 flex-col overflow-hidden relative">
						{/* Mobile-only spinner — keeps the full-page blocker for small screens
                where the chat progress card isn't visible. Desktop users see the
                empty PrdViewer + the section progress card in the chat panel. */}
						{isGeneratingPRD && !streamingPRDContent && !latestVersion && (
							<div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 md:hidden bg-onyx">
								<div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo border-t-transparent" />
								<p className="mt-4 text-sm font-[510] text-snow">
									Sedang membuat PRD...
								</p>
								<p className="mt-1 text-xs text-fog">
									Model AI sedang menganalisis jawaban Anda
								</p>
							</div>
						)}
						<PrdViewer
							content={streamingForView ? streamingForView : currentContent}
							projectName={projectName || ""}
							plan={plan}
							versions={versions?.map((v) => ({
								id: v.id,
								version: v.version,
								content: v.content,
								change_summary: v.change_summary,
								created_at: v.created_at,
							}))}
							currentVersion={selectedVersionNum}
							onSelectVersion={handleVersionSelect}
							className="flex-1 overflow-hidden"
						/>
					</div>
				</div>

				{/* ═══════════ Right Panel: Desktop Chat ═══════════ */}
				<div
					id="print-hide-chat"
					style={{
						width: isChatOpen ? `${rightWidth}px` : "0px",
						background: "var(--bg-elevated)",
					}}
					className={cn(
						"group/right-sidebar relative hidden shrink-0 border-l border-graphite print:hidden xl:block",
						!isDraggingRight && "transition-all duration-300",
						!isChatOpen && "overflow-hidden border-none",
					)}
				>
					{isChatOpen && (
						<div
							className="absolute bottom-0 left-[-4px] top-0 z-10 w-2 cursor-col-resize transition-colors hover:bg-indigo/20"
							onMouseDown={onStartDragRight}
						/>
					)}
					<div
						className="h-full w-full"
						style={{ display: isChatOpen ? "block" : "none" }}
					>
						<ChatPanel
							projectId={projectId}
							conversationId={conversationId}
							onProjectCreated={handleProjectCreated}
							onPrdRevised={handlePrdRevised}
							className="w-full"
							inputDisabled={!projectId && !isGeneratingPRD}
							currentPrdContent={currentContent}
							userPlan={plan}
							selectedVersionNum={selectedVersionNum}
						/>
					</div>
				</div>

				{/* ═══════════ Mobile Chat View (<md) & Drawer (md to xl) ═══════════ */}
				{/* 1. Full panel for Mobile View tab toggle (<md) */}
				<div
					className={cn(
						"flex-1 overflow-hidden md:hidden",
						activeTab !== "chat" && "hidden",
					)}
				>
					<ChatPanel
						projectId={projectId}
						conversationId={conversationId}
						onProjectCreated={handleProjectCreated}
						onPrdRevised={handlePrdRevised}
						className="h-full w-full border-none"
						enableAutoSubmit={false}
						inputDisabled={!projectId && !isGeneratingPRD}
						currentPrdContent={currentContent}
						userPlan={plan}
						selectedVersionNum={selectedVersionNum}
					/>
				</div>

				{/* 2. Slide-over drawer for tablet screens (md to xl) */}
				<div className="hidden md:block xl:hidden print:hidden">
					{isChatOpen && (
						<div
							role="dialog"
							aria-modal="true"
							aria-label="Panel chat revisi"
							className="fixed bottom-0 left-0 right-0 z-40 h-[60vh] rounded-t-xl bg-charcoal shadow-[var(--shadow-overlay)]"
						>
							<div className="flex items-center justify-between border-b border-graphite px-4 py-2">
								<span className="text-sm font-[510]">Chat</span>
								<button
									onClick={toggleChat}
									aria-label="Tutup chat"
									className="text-fog hover:text-snow"
								>
									<X size={16} />
								</button>
							</div>
							<div className="h-[calc(60vh-44px)]">
								<ChatPanel
									projectId={projectId}
									conversationId={conversationId}
									onProjectCreated={handleProjectCreated}
									onPrdRevised={handlePrdRevised}
									className="w-full border-none"
									enableAutoSubmit={false}
									inputDisabled={!projectId && !isGeneratingPRD}
									currentPrdContent={currentContent}
									userPlan={plan}
									selectedVersionNum={selectedVersionNum}
								/>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
