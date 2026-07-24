/**
 * AC-related database operations.
 * Mirrors prd-service.ts pattern: parse markdown → AcFeature[], save to ac_versions (JSONB).
 */

import type { AcFeature, AcVersion } from "@/types/database";

// ponytail: InsForge SDK belum expose client types. Ganti saat tersedia.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InsForgeClient = any;

/**
 * Parse AI-generated markdown into structured AcFeature[].
 * Format: `### Feature: <name>` + `- [ ] <criterion>` lines.
 * Ceiling: only handles `### Feature: X` headings. If AI uses different heading level,
 * features split incorrectly. Prompt enforces format.
 */
export function parseAcMarkdown(markdown: string): AcFeature[] {
  const features: AcFeature[] = [];
  let cur: AcFeature | null = null;

  for (const line of markdown.split("\n")) {
    const fm = line.match(/^###\s+(?:Feature:\s*)?(.+)/);
    if (fm) {
      if (cur) features.push(cur);
      cur = { featureName: fm[1].trim(), criteria: [] };
      continue;
    }
    const cm = line.match(/^- \[([ x])\] (.+)/);
    if (cm && cur) cur.criteria.push(cm[2].trim());
  }
  if (cur) features.push(cur);
  return features;
}

/**
 * Convert AcFeature[] back to markdown (for display/patching).
 */
export function acFeaturesToMarkdown(features: AcFeature[]): string {
  return features
    .map((f) => {
      const criteria = f.criteria.map((c) => `- [ ] ${c}`).join("\n");
      return `### Feature: ${f.featureName}\n${criteria}`;
    })
    .join("\n\n");
}

/**
 * Save AC version (generate or revise).
 * Parses markdown → AcFeature[], inserts ac_versions row, updates projects.ac_status.
 * For mode="generate": also updates projects.step='ac' (advance flow step).
 */
export async function saveAcVersion(
  insforge: InsForgeClient,
  projectId: string,
  fullResponse: string,
  userMessage: string,
  mode: "generate" | "revise",
): Promise<{ acVersionId: string; version: number }> {
  const content = parseAcMarkdown(fullResponse);

  // Determine next version (SELECT max version + 1, start at 1)
  const { data: latestVersion } = await insforge.database
    .from("ac_versions")
    .select("version")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

  // Insert ac_versions row
  const { data: insertedRows, error } = await insforge.database
    .from("ac_versions")
    .insert([
      {
        project_id: projectId,
        version: nextVersion,
        content,
        change_summary: userMessage || (mode === "generate" ? "Initial AC generation" : "AC revision"),
      },
    ])
    .select("id");

  if (error) throw error;
  if (!insertedRows?.length) throw new Error("Failed to insert AC version");

  // Update projects.ac_status='completed'
  const updateData: Record<string, unknown> = {
    ac_status: "completed",
    updated_at: new Date().toISOString(),
  };
  if (mode === "generate") {
    updateData.step = "ac"; // advance flow step
  }

  await insforge.database
    .from("projects")
    .update(updateData)
    .eq("id", projectId);

  return { acVersionId: insertedRows[0].id, version: nextVersion };
}

/**
 * Get latest AC content as structured AcFeature[].
 */
export async function getLatestAcContent(
  insforge: InsForgeClient,
  projectId: string,
): Promise<AcFeature[] | null> {
  const { data: latestVersion } = await insforge.database
    .from("ac_versions")
    .select("content")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestVersion) return null;
  return latestVersion.content as AcFeature[];
}

/**
 * Get latest AC content as markdown (for patching in revise flow).
 */
export async function getLatestAcMarkdown(
  insforge: InsForgeClient,
  projectId: string,
): Promise<string | null> {
  const features = await getLatestAcContent(insforge, projectId);
  if (!features) return null;
  return acFeaturesToMarkdown(features);
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
