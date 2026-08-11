/**
 * AC versions - Drizzle DB ops. Mirrors prd-service.ts.
 * New schema: ac_versions(project_id, version, content, change_summary).
 */
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { acVersions, projects } from "@/db/schema";
import { advanceStep } from "@/lib/flow-progress";

/**
 * Save AC version. Advances projects.step to 'ac' — but only forward:
 * re-generating AC after Task is done must not rewind step to 'ac'
 * (that sent History back to the AC page).
 */
export async function saveAcVersion(
	projectId: string,
	fullResponse: string,
	userMessage: string,
): Promise<{ acVersionId: string; version: number }> {
	const [latest] = await db
		.select({ version: acVersions.version })
		.from(acVersions)
		.where(eq(acVersions.projectId, projectId))
		.orderBy(desc(acVersions.version))
		.limit(1);
	let nextVersion = latest ? latest.version + 1 : 1;

	const inserted = await db
		.insert(acVersions)
		.values({
			id: crypto.randomUUID(),
			projectId,
			version: nextVersion,
			content: fullResponse,
			changeSummary: userMessage || "Initial AC generation",
		})
		.returning({ id: acVersions.id })
		.catch(async (err: unknown): Promise<{ id: string }[]> => {
			// unique (project_id, version) violation — another writer took this number.
			// re-read the new max and retry once.
			const msg = err instanceof Error ? err.message : String(err);
			if (!msg.includes("23505")) throw err;
			const [r] = await db
				.select({ version: acVersions.version })
				.from(acVersions)
				.where(eq(acVersions.projectId, projectId))
				.orderBy(desc(acVersions.version))
				.limit(1);
			nextVersion = (r?.version ?? nextVersion) + 1;
			return db
				.insert(acVersions)
				.values({
					id: crypto.randomUUID(),
					projectId,
					version: nextVersion,
					content: fullResponse,
					changeSummary: userMessage || "Initial AC generation",
				})
				.returning({ id: acVersions.id });
		});

	if (!inserted || !inserted.length)
		throw new Error("Failed to insert AC version");
	const insertedRow = inserted[0];

	const updateData: { acStatus: string; updatedAt: Date; step?: string } = {
		acStatus: "completed",
		updatedAt: new Date(),
	};
	const [proj] = await db
		.select({ step: projects.step })
		.from(projects)
		.where(eq(projects.id, projectId))
		.limit(1);
	const next = advanceStep(proj?.step, "ac");
	if (next) updateData.step = next;
	await db.update(projects).set(updateData).where(eq(projects.id, projectId));

	return { acVersionId: insertedRow.id, version: nextVersion };
}

export async function getLatestAcContent(
	projectId: string,
): Promise<string | null> {
	const [row] = await db
		.select({ content: acVersions.content })
		.from(acVersions)
		.where(eq(acVersions.projectId, projectId))
		.orderBy(desc(acVersions.version))
		.limit(1);
	return row?.content ?? null;
}

export async function getLatestAcMarkdown(
	projectId: string,
): Promise<string | null> {
	return getLatestAcContent(projectId);
}
