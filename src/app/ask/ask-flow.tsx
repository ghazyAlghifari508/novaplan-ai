"use client";

import { Cloud, Database, Layers, Palette, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
	getAskPlatform,
	getAskState,
	getSetupPrompt,
	saveAskState,
	clearAskState,
	savePendingPrdPrompt,
} from "@/lib/prompt-handoff";
import { type NonTechAnswer, QuestionCard } from "./question-card";
import { StackDropdown } from "./stack-dropdown";

const FRONTEND_WEB_OPTIONS = [
	"React (Vite)",
	"Next.js",
	"Vue.js",
	"Svelte",
	"Astro",
	"Native HTML/CSS/JS",
	"TanStack Start",
	"Nuxt",
	"Angular",
];
const FRONTEND_MOBILE_OPTIONS = [
	"Flutter",
	"React Native",
	"Native iOS (Swift)",
	"Native Android (Kotlin)",
	"Expo",
];
const BACKEND_OPTIONS = [
	"Express.js",
	"Fastify",
	"Go",
	"Python (FastAPI/Django)",
	"Supabase",
	"Insforge",
	"Convex",
	"Firebase",
];
const FULLSTACK_FRAMEWORK_OPTIONS = [
	"Laravel Blade",
	"Laravel + React (Inertia)",
	"Laravel + Vue (Inertia)",
	"Next.js (FE+BE)",
	"Nuxt.js (FE+BE)",
	"TanStack Start (FE+BE)",
];
const DATABASE_OPTIONS = [
	"PostgreSQL",
	"MySQL",
	"SQLite",
	"MongoDB",
	"Neon",
	"Supabase Postgres",
];
const DEPLOYMENT_OPTIONS = [
	"Vercel",
	"Docker/K8s (self-hosted)",
	"Coolify",
	"VPS Manual",
	"Railway",
	"Netlify",
	"GitHub Pages",
];

interface AskQuestion {
	id: string;
	question: string;
	options: string[];
}

interface TechAnswers {
	frontend?: string;
	backend?: string;
	fullstackFramework?: string;
	database?: string;
	deployment?: string;
}

interface AskFlowProps {
	projectId: string;
	projectName: string;
}

export function AskFlow({ projectId, projectName }: AskFlowProps) {
	const router = useRouter();
	const promptRef = useRef("");
	const hasFetched = useRef(false);
	const [session, setSession] = useState<1 | 2>(1);
	const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
	const [loadError, setLoadError] = useState("");
	const [questions, setQuestions] = useState<AskQuestion[]>([]);
	const [nonTechAnswers, setNonTechAnswers] = useState<
		Record<string, NonTechAnswer>
	>({});
	const [techAnswers, setTechAnswers] = useState<TechAnswers>({});
	const [platform, setPlatform] = useState<"web" | "mobile">("web");

	// ponytail: deps kosong disengaja. `useRouter()` dari shim next-compat bikin
	// objek baru tiap render — kalau masuk dep array, effect re-run terus dan
	// cleanup abort membunuh fetch yang sedang jalan, sementara guard hasFetched
	// memblokir fetch ulang → layar "Gagal memuat pertanyaan." padahal tidak ada
	// error. Fetch cukup sekali per mount; hasFetched menjaga StrictMode
	// double-invoke.
	// biome-ignore lint/correctness/useExhaustiveDependencies: lihat catatan di atas
	useEffect(() => {
		if (hasFetched.current) return;
		hasFetched.current = true;

		// Restore state persisted across refresh/hard-refresh. If a saved set
		// exists for THIS project, replay it and skip regenerating questions.
		const saved = getAskState(projectId);
		if (saved) {
			promptRef.current = saved.prompt;
			setPlatform(saved.platform);
			setSession(saved.session);
			setQuestions(saved.questions);
			setNonTechAnswers(saved.nonTechAnswers);
			setTechAnswers(saved.techAnswers);
			setIsLoadingQuestions(false);
			return;
		}

		// Non-consuming read: the prompt is still needed at submit time to build the
		// final PRD prompt, and a refresh mid-flow must not lose it.
		const prompt = getSetupPrompt();
		if (!prompt) {
			router.replace("/");
			return;
		}
		promptRef.current = prompt;
		setPlatform(getAskPlatform());

		const fetchOptions = async () => {
			try {
				const res = await fetch("/api/ask/options", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						projectId,
						prompt,
						platform: getAskPlatform(),
						model:
							sessionStorage.getItem("novaplan:selected-model") || undefined,
					}),
				});
				const data = (await res.json().catch(() => ({}))) as {
					questions?: AskQuestion[];
					error?: string;
				};
				if (!res.ok) throw new Error(data.error || "Gagal memuat pertanyaan");
				setQuestions(data.questions ?? []);
			} catch (err) {
				console.error("Fetch ask options error:", err);
				setLoadError(
					err instanceof Error ? err.message : "Gagal memuat pertanyaan",
				);
			} finally {
				setIsLoadingQuestions(false);
			}
		};
		fetchOptions();
	}, []);

	// Persist across refresh/hard-refresh: write state whenever it changes.
	// Only once questions exist — avoids persisting an empty placeholder.
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional full-state snapshot
	useEffect(() => {
		if (questions.length === 0 || !promptRef.current) return;
		saveAskState({
			projectId,
			prompt: promptRef.current,
			platform,
			session,
			questions,
			nonTechAnswers,
			techAnswers,
		});
	}, [questions, nonTechAnswers, techAnswers, session, platform, projectId]);

	const fullstackDisabled = Boolean(
		techAnswers.frontend || techAnswers.backend,
	);
	const feBeDisabled = Boolean(techAnswers.fullstackFramework);
	const frontendOptions =
		platform === "mobile" ? FRONTEND_MOBILE_OPTIONS : FRONTEND_WEB_OPTIONS;

	const answeredCount = Object.values(nonTechAnswers).filter(
		(a) => a.value || a.skipped,
	).length;
	const allNonTechAnswered =
		questions.length > 0 &&
		questions.every((q) => {
			const a = nonTechAnswers[q.id];
			return a && (a.value || a.skipped);
		});
	const allTechAnswered =
		Boolean(techAnswers.database) &&
		Boolean(techAnswers.deployment) &&
		(Boolean(techAnswers.fullstackFramework) ||
			(Boolean(techAnswers.frontend) && Boolean(techAnswers.backend)));

	const submit = (tech: TechAnswers) => {
		const nonTechLines = questions.map((q) => {
			const a = nonTechAnswers[q.id];
			if (!a || a.skipped || !a.value)
				return `- ${q.question}: (Biarkan AI yang memilih)`;
			return `- ${q.question}: ${a.value}`;
		});

		const platformLabel = platform === "mobile" ? "Mobile App" : "Web App";
		const compiledPrompt = `Tolong buatkan PRD dengan spesifikasi berikut:

[Platform: ${platformLabel}]
${promptRef.current}

--- Preferensi Non-Teknis ---
${nonTechLines.join("\n")}

--- Preferensi Teknis ---
Frontend: ${tech.frontend || "Biarkan AI yang memilih"}
Backend: ${tech.backend || "Biarkan AI yang memilih"}
Fullstack Framework: ${tech.fullstackFramework || "Tidak dipakai / Biarkan AI yang memilih"}
Database: ${tech.database || "Biarkan AI yang memilih"}
Deployment: ${tech.deployment || "Biarkan AI yang memilih"}`;

		savePendingPrdPrompt(compiledPrompt, "auto", projectName);
		clearAskState();
		router.push(`/prd/${projectId}`);
	};

	if (isLoadingQuestions) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="animate-pulse font-inter text-fog">
					Menyusun pertanyaan...
				</p>
			</div>
		);
	}

	if (loadError || questions.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3 text-center">
				<p className="font-inter text-fog">
					{loadError || "Gagal memuat pertanyaan."}
				</p>
				<button
					type="button"
					onClick={() => router.push("/")}
					className="btn-primary rounded-md px-4 py-2 font-inter text-sm"
				>
					Kembali ke Home
				</button>
			</div>
		);
	}

	return (
		<div className="hide-scrollbar mx-auto flex-1 w-full max-w-3xl overflow-y-auto px-6 py-12 min-h-0">
			<div className="mb-8 flex items-center justify-between">
				<div>
					<p className="font-inter text-xs uppercase tracking-wide text-fog">
						Sesi {session} dari 2
					</p>
					<h1
						className="font-inter text-2xl font-[510]"
						style={{ color: "var(--text-primary)" }}
					>
						{session === 1 ? "Ceritakan lebih lanjut" : "Preferensi Teknis"}
					</h1>
				</div>
				{session === 1 && (
					<span className="font-inter text-sm text-fog">
						{answeredCount}/{questions.length}
					</span>
				)}
			</div>

			{session === 1 ? (
				<div className="space-y-4 pb-8">
					{questions.map((q) => (
						<QuestionCard
							key={q.id}
							question={q.question}
							options={q.options}
							answer={nonTechAnswers[q.id]}
							onAnswer={(answer) =>
								setNonTechAnswers((prev) => ({ ...prev, [q.id]: answer }))
							}
						/>
					))}
					<div className="flex justify-end pt-2">
						<button
							type="button"
							disabled={!allNonTechAnswered}
							onClick={() => setSession(2)}
							className="btn-primary rounded-md px-6 py-2.5 font-inter text-sm font-[510] disabled:opacity-40 disabled:cursor-not-allowed"
						>
							Lanjut
						</button>
					</div>
				</div>
			) : (
				<div className="space-y-6 pb-8">
					<div className="grid gap-4 sm:grid-cols-2">
						<StackDropdown
							label="Frontend"
							subtitle="UI & tampilan user"
							icon={Palette}
							accent="#5e6ad2"
							placeholder="Pilih frontend..."
							options={frontendOptions}
							value={techAnswers.frontend}
							disabled={feBeDisabled}
							onChange={(v) =>
								setTechAnswers((prev) => ({ ...prev, frontend: v }))
							}
						/>
						<StackDropdown
							label="Backend"
							subtitle="Logic & API server"
							icon={Cloud}
							accent="#2dd4a7"
							placeholder="Pilih backend..."
							options={BACKEND_OPTIONS}
							value={techAnswers.backend}
							disabled={feBeDisabled}
							onChange={(v) =>
								setTechAnswers((prev) => ({ ...prev, backend: v }))
							}
						/>
						<StackDropdown
							label="Fullstack Framework"
							subtitle="Frontend + backend jadi satu"
							icon={Layers}
							accent="#e879a6"
							placeholder="Pilih framework..."
							options={FULLSTACK_FRAMEWORK_OPTIONS}
							value={techAnswers.fullstackFramework}
							disabled={fullstackDisabled}
							onChange={(v) =>
								setTechAnswers((prev) => ({ ...prev, fullstackFramework: v }))
							}
						/>
						<StackDropdown
							label="Database"
							subtitle="Penyimpanan data"
							icon={Database}
							accent="#f5b544"
							placeholder="Pilih database..."
							options={DATABASE_OPTIONS}
							value={techAnswers.database}
							disabled={false}
							onChange={(v) =>
								setTechAnswers((prev) => ({ ...prev, database: v }))
							}
						/>
						<StackDropdown
							label="Deployment"
							subtitle="Hosting & infra"
							icon={Rocket}
							accent="#a78bfa"
							placeholder="Pilih platform..."
							options={DEPLOYMENT_OPTIONS}
							value={techAnswers.deployment}
							disabled={false}
							onChange={(v) =>
								setTechAnswers((prev) => ({ ...prev, deployment: v }))
							}
						/>
					</div>

					<div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--border-subtle) pt-6">
						<button
							type="button"
							onClick={() => setSession(1)}
							className="font-inter text-sm text-fog hover:text-snow"
						>
							Kembali
						</button>
						<button
							type="button"
							disabled={!allTechAnswered}
							onClick={() => submit(techAnswers)}
							className="btn-primary rounded-md px-6 py-2.5 font-inter text-sm font-[510] disabled:opacity-40 disabled:cursor-not-allowed"
						>
							Generate PRD
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
