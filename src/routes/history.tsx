import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq, inArray } from "drizzle-orm";
import { HistoryPage } from "@/components/history/history-page";
import { db } from "@/db";
import { acVersions, prdVersions, projects } from "@/db/schema";
import { requireUserServer } from "@/lib/session";

export interface HistoryItem {
	id: string;
	name: string;
	step: string | null;
	lastUrl: string | null;
	updatedAt: Date;
	preview: string | null;
	acStatus: string | null;
	taskStatus: string | null;
}

// ponytail: requireUserServer is a server fn → its auth/db imports get pruned
// from the client bundle. Plain requireUser would drag pg (→ Buffer) in.
const loadHistory = createServerFn({ method: "GET" }).handler(async () => {
	const user = await requireUserServer();

	const projectRows = await db
		.select({
			id: projects.id,
			name: projects.name,
			step: projects.step,
			lastUrl: projects.lastUrl,
			updatedAt: projects.updatedAt,
			acStatus: projects.acStatus,
			taskStatus: projects.taskStatus,
		})
		.from(projects)
		.where(eq(projects.userId, user.id))
		.orderBy(desc(projects.updatedAt));

	if (projectRows.length === 0) return { items: [] as HistoryItem[] };

	const ids = projectRows.map((p) => p.id);
	// Batch-fetch latest PRD + AC content per project in 2 queries, not N.
	const [prdRows, acRows] = await Promise.all([
		db
			.select({
				projectId: prdVersions.projectId,
				content: prdVersions.content,
				version: prdVersions.version,
			})
			.from(prdVersions)
			.where(inArray(prdVersions.projectId, ids))
			.orderBy(desc(prdVersions.version)),
		db
			.select({
				projectId: acVersions.projectId,
				content: acVersions.content,
				version: acVersions.version,
			})
			.from(acVersions)
			.where(inArray(acVersions.projectId, ids))
			.orderBy(desc(acVersions.version)),
	]);

	// Latest version per project = first occurrence (rows already desc by version).
	const latestPrd = new Map<string, string>();
	for (const r of prdRows) {
		if (!latestPrd.has(r.projectId)) latestPrd.set(r.projectId, r.content);
	}
	const latestAc = new Map<string, string>();
	for (const r of acRows) {
		if (!latestAc.has(r.projectId)) latestAc.set(r.projectId, r.content);
	}

	const items: HistoryItem[] = projectRows.map((p) => {
		// Preview = latest AC if at/ past ac step, else latest PRD. Stripped + capped.
		const atOrPastAc = p.step === "ac" || p.step === "task";
		const raw = atOrPastAc ? latestAc.get(p.id) : latestPrd.get(p.id);
		const preview = raw ? stripMarkdown(raw).slice(0, 160) : null;
		return {
			id: p.id,
			name: p.name,
			step: p.step,
			lastUrl: p.lastUrl,
			updatedAt: p.updatedAt ?? new Date(0),
			preview,
			acStatus: p.acStatus,
			taskStatus: p.taskStatus,
		};
	});

	return { items };
});

// ponytail: cheap markdown strip for a one-line preview. Not a full parser -
// fences, headings, emphasis markers removed, whitespace collapsed. Cap 160.
function stripMarkdown(raw: string): string {
	return raw
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/[#>*_`~]/g, " ")
		.replace(/\[(.*?)\]\(.*?\)/g, "$1")
		.replace(/\s+/g, " ")
		.trim();
}

export const Route = createFileRoute("/history")({
	loader: async () => {
		try {
			return await loadHistory();
		} catch (e) {
			if ((e as Error).message === "Unauthorized")
				throw redirect({ to: "/login" });
			throw e;
		}
	},
	head: () => ({ meta: [{ title: "History | NovaPlan" }] }),
	component: HistoryRoutePage,
});

function HistoryRoutePage() {
	const { items } = Route.useLoaderData();
	return <HistoryPage items={items} />;
}
