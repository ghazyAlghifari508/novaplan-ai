/**
 * AC-related database operations.
 * Mirrors prd-service.ts pattern: store raw markdown string directly in ac_versions (JSONB column, string value).
 */

import type { AcVersion } from "@/types/database";

// ponytail: InsForge SDK belum expose client types. Ganti saat tersedia.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InsForgeClient = any;

/**
 * Save AC version (generate or revise).
 * Stores raw markdown string directly (no parsing), mirrors prd-service.ts.
 * For mode="generate": also updates projects.step='ac' (advance flow step).
 */
export async function saveAcVersion(
  insforge: InsForgeClient,
  projectId: string,
  fullResponse: string,
  userMessage: string,
  mode: "generate" | "revise",
): Promise<{ acVersionId: string; version: number }> {
  const { data: latestVersion } = await insforge.database
    .from("ac_versions")
    .select("version")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

  const { data: insertedRows, error } = await insforge.database
    .from("ac_versions")
    .insert([
      {
        project_id: projectId,
        version: nextVersion,
        content: fullResponse,
        change_summary: userMessage || (mode === "generate" ? "Initial AC generation" : "AC revision"),
      },
    ])
    .select("id");

  if (error) throw error;
  if (!insertedRows?.length) throw new Error("Failed to insert AC version");

  const updateData: Record<string, unknown> = {
    ac_status: "completed",
    updated_at: new Date().toISOString(),
  };
  if (mode === "generate") {
    updateData.step = "ac";
  }

  await insforge.database
    .from("projects")
    .update(updateData)
    .eq("id", projectId);

  return { acVersionId: insertedRows[0].id, version: nextVersion };
}

/**
 * Get latest AC content as raw markdown string.
 */
export async function getLatestAcContent(
  insforge: InsForgeClient,
  projectId: string,
): Promise<string | null> {
  const { data: latestVersion } = await insforge.database
    .from("ac_versions")
    .select("content")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestVersion) return null;
  return latestVersion.content as string;
}

/**
 * Get latest AC content as markdown (alias — content is already raw markdown).
 */
export async function getLatestAcMarkdown(
  insforge: InsForgeClient,
  projectId: string,
): Promise<string | null> {
  return getLatestAcContent(insforge, projectId);
}

/**
 * Get all AC versions for a project (for version history).
 */
export async function getAcVersions(
  insforge: InsForgeClient,
  projectId: string,
): Promise<AcVersion[]> {
  const { data: versions, error } = await insforge.database
    .from("ac_versions")
    .select("*")
    .eq("project_id", projectId)
    .order("version", { ascending: false });

  if (error) throw error;
  return versions || [];
}
