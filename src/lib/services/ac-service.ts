/**
 * AC versions - Drizzle DB ops. Mirrors prd-service.ts.
 * New schema: ac_versions(project_id, version, content, change_summary).
 */
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { acVersions, projects } from "@/db/schema";

/**
 * Save AC version (generate or revise). Advances projects.step='ac' on generate.
 */
export async function saveAcVersion(
  projectId: string,
  fullResponse: string,
  userMessage: string,
  mode: "generate" | "revise",
): Promise<{ acVersionId: string; version: number }> {
  const [latest] = await db
    .select({ version: acVersions.version })
    .from(acVersions)
    .where(eq(acVersions.projectId, projectId))
    .orderBy(desc(acVersions.version))
    .limit(1);
  const nextVersion = latest ? latest.version + 1 : 1;

  const [inserted] = await db
    .insert(acVersions)
    .values({
      id: crypto.randomUUID(),
      projectId,
      version: nextVersion,
      content: fullResponse,
      changeSummary: userMessage || (mode === "generate" ? "Initial AC generation" : "AC revision"),
    })
    .returning({ id: acVersions.id });

  if (!inserted) throw new Error("Failed to insert AC version");

  const updateData: { acStatus: string; updatedAt: Date; step?: string } = {
    acStatus: "completed",
    updatedAt: new Date(),
  };
  if (mode === "generate") updateData.step = "ac";
  await db.update(projects).set(updateData).where(eq(projects.id, projectId));

  return { acVersionId: inserted.id, version: nextVersion };
}

export async function getLatestAcContent(projectId: string): Promise<string | null> {
  const [row] = await db
    .select({ content: acVersions.content })
    .from(acVersions)
    .where(eq(acVersions.projectId, projectId))
    .orderBy(desc(acVersions.version))
    .limit(1);
  return row?.content ?? null;
}

export async function getLatestAcMarkdown(projectId: string): Promise<string | null> {
  return getLatestAcContent(projectId);
}

export async function getAcVersions(projectId: string) {
  return db
    .select()
    .from(acVersions)
    .where(eq(acVersions.projectId, projectId))
    .orderBy(desc(acVersions.version));
}
