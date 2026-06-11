/**
 * PRD-related database operations.
 * Extracted from api/chat/route.ts to follow Single Responsibility Principle.
 */

import { generateShareToken } from "@/lib/utils";

type InsForgeClient = any; // edge runtime doesn't support full type

/**
 * Derive a human-readable project name from the user's raw prompt.
 * Strips boilerplate, meta tags, and common conversational fillers.
 */
export function deriveProjectName(message: string): string {
  let cleanMsg = message;

  // Strip standard template boilerplate FIRST
  cleanMsg = cleanMsg.replace(/Generate PRD lengkap berdasarkan informasi berikut:\s*/gi, "");
  cleanMsg = cleanMsg.replace(/\s*Gunakan section markers sesuai standar./gi, "");

  // Now strip meta tags like `[: Web App]` or `[E-commerce: Mobile App]`
  cleanMsg = cleanMsg.replace(/\[.*?\]\s*/gi, "");

  // List of common conversational fillers and generic terms in Indonesian
  const fillers = [
    "tolong", "coba", "bantu", "harap",
    "buatkan", "bikin", "generate", "tuliskan", "buat",
    "gw", "saya", "kami", "aku",
    "sebuah", "satu", "suatu",
    "prd", "dokumen",
    "untuk", "tentang", "membuat", "membangun", "bikinin",
    "aplikasi", "website", "platform", "sistem", "web", "app", "apps", "mobile", "desktop", "software",
  ];

  // Strip conversational fillers safely
  const fillerRegex = new RegExp(`\\b(?:${fillers.join("|")})\\b`, "gi");
  cleanMsg = cleanMsg.replace(fillerRegex, "");

  cleanMsg = cleanMsg.replace(/\s+/g, " ").trim();

  if (cleanMsg.length < 3) return "Project Baru";

  const words = cleanMsg.split(" ");
  // Take max 4 words for a cleaner title
  let projectName = words.slice(0, 4).join(" ");
  if (words.length > 4) projectName += "...";

  // Capitalize first letter of each word
  projectName = projectName
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return projectName.trim().length < 3 ? "Project Baru" : projectName;
}

/**
 * Save a PRD version and mark the project as completed.
 */
export async function savePrdVersion(
  insforge: InsForgeClient,
  conversationId: string,
  fullResponse: string,
  userMessage: string,
  mode: "generate" | "revise",
): Promise<void> {
  const { data: conv } = await insforge.database
    .from("conversations")
    .select("project_id")
    .eq("id", conversationId)
    .single();

  if (!conv?.project_id) return;

  let nextVersion = 1;

  if (mode === "revise") {
    const { data: latestVersion } = await insforge.database
      .from("prd_versions")
      .select("version")
      .eq("project_id", conv.project_id)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (latestVersion) {
      nextVersion = latestVersion.version + 1;
    }
  } else {
    // For new generation, we want a share token
    const shareToken = generateShareToken();
    await insforge.database
      .from("projects")
      .update({ share_token: shareToken })
      .eq("id", conv.project_id);
  }

  const { error: prdVersionError } = await insforge.database.from("prd_versions").insert([{
    project_id: conv.project_id,
    version: nextVersion,
    content: fullResponse,
    change_summary:
      mode === "generate"
        ? "Initial PRD generation"
        : userMessage.substring(0, 50) + "...",
  }]);

  if (prdVersionError) throw prdVersionError;

  const { error: projectUpdateError } = await insforge.database
    .from("projects")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", conv.project_id);

  if (projectUpdateError) throw projectUpdateError;
}

/**
 * Get the latest PRD content for a project.
 */
export async function getLatestPrdContent(
  insforge: InsForgeClient,
  projectId: string,
): Promise<string | null> {
  const { data } = await insforge.database
    .from("prd_versions")
    .select("content")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  return data?.content || null;
}

/**
 * Resolve the project ID from a conversation if not directly available.
 */
export async function resolveProjectId(
  insforge: InsForgeClient,
  projectId: string | undefined,
  conversationId: string | undefined,
): Promise<string | undefined> {
  if (projectId) return projectId;
  if (!conversationId) return undefined;

  const { data: convRecord } = await insforge.database
    .from("conversations")
    .select("project_id")
    .eq("id", conversationId)
    .single();

  return convRecord?.project_id;
}
