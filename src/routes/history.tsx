import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq, inArray } from "drizzle-orm";
import { HistoryPage } from "@/components/history/history-page";
import { db } from "@/db";
import { prdVersions, projects } from "@/db/schema";
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
	const prdRows = await db
		.select({
			projectId: prdVersions.projectId,
			content: prdVersions.content,
			version: prdVersions.version,
		})
		.from(prdVersions)
		.where(inArray(prdVersions.projectId, ids))
		.orderBy(desc(prdVersions.version));

	const latestPrd = new Map<string, string>();
	for (const r of prdRows) {
		if (!latestPrd.has(r.projectId)) latestPrd.set(r.projectId, r.content);
	}

	const items: HistoryItem[] = projectRows.map((p) => {
		const raw = latestPrd.get(p.id);
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
