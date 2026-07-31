/**
 * PRD helpers + DB ops - Drizzle. New schema: prd_versions(project_id, version,
 * content, change_summary); projects.share_token exists.
 */
import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, prdVersions, projects } from "@/db/schema";

// ponytail: moved from utils.ts - node:crypto crashes browser bundles via utils.ts.
export function generateShareToken(): string {
  return randomBytes(9).toString("base64url");
}

/**
 * Derive a human-readable project name from the user's raw prompt.
 */
export function deriveProjectName(message: string): string {
  let cleanMsg = message;
  cleanMsg = cleanMsg.replace(/Generate PRD lengkap berdasarkan informasi berikut:\s*/gi, "");
  cleanMsg = cleanMsg.replace(/\s*Gunakan section markers sesuai standar./gi, "");
  cleanMsg = cleanMsg.replace(/\[.*?\]\s*/gi, "");

  const fillers = [
    "tolong", "coba", "bantu", "harap",
    "buatkan", "bikin", "generate", "tuliskan", "buat",
    "gw", "saya", "kami", "aku",
    "sebuah", "satu", "suatu",
    "prd", "dokumen",
    "untuk", "tentang", "membuat", "membangun", "bikinin",
    "aplikasi", "website", "platform", "sistem", "web", "app", "apps", "mobile", "desktop", "software",
  ];
  const fillerRegex = new RegExp(`\\b(?:${fillers.join("|")})\\b`, "gi");
  cleanMsg = cleanMsg.replace(fillerRegex, "");
  cleanMsg = cleanMsg.replace(/\s+/g, " ").trim();

  if (cleanMsg.length < 3) return "Project Baru";

  const words = cleanMsg.split(" ");
  let projectName = words.slice(0, 4).join(" ");
  if (words.length > 4) projectName += "...";
  projectName = projectName
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return projectName.trim().length < 3 ? "Project Baru" : projectName;
}

/**
 * Save a PRD version + mark project completed. On generate, set share token.
 * Resolves projectId from conversationId if needed.
 */
export async function savePrdVersion(
  conversationId: string,
  fullResponse: string,
  userMessage: string,
  mode: "generate" | "revise",
): Promise<void> {
  const [conv] = await db
    .select({ projectId: conversations.projectId })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conv?.projectId) {
    console.warn("savePrdVersion: conversation missing project_id, content discarded", { conversationId });
    return;
  }
  const projectId = conv.projectId;

  if (mode === "generate") {
    await db
      .update(projects)
      .set({ shareToken: generateShareToken() })
      .where(eq(projects.id, projectId));
  }

  let nextVersion = 1;
  if (mode === "revise") {
    const [latest] = await db
      .select({ version: prdVersions.version })
      .from(prdVersions)
      .where(eq(prdVersions.projectId, projectId))
      .orderBy(desc(prdVersions.version))
      .limit(1);
    if (latest) nextVersion = latest.version + 1;
  }

  await db.insert(prdVersions).values({
    id: crypto.randomUUID(),
    projectId,
    version: nextVersion,
    content: fullResponse,
    changeSummary:
      mode === "generate" ? "Initial PRD generation" : `${userMessage.substring(0, 50)}...`,
  });

  await db.update(projects).set({ status: "completed", updatedAt: new Date() }).where(eq(projects.id, projectId));
}

export async function getPrdVersionContent(projectId: string, version: number): Promise<string | null> {
  const [row] = await db
    .select({ content: prdVersions.content })
    .from(prdVersions)
    .where(and(eq(prdVersions.projectId, projectId), eq(prdVersions.version, version)))
    .limit(1);
  return row?.content ?? null;
}

export async function getLatestPrdContent(projectId: string): Promise<string | null> {
  const [row] = await db
    .select({ content: prdVersions.content })
    .from(prdVersions)
    .where(eq(prdVersions.projectId, projectId))
    .orderBy(desc(prdVersions.version))
    .limit(1);
  return row?.content ?? null;
}

export async function resolveProjectId(
  projectId: string | undefined,
  conversationId: string | undefined,
): Promise<string | undefined> {
  if (projectId) return projectId;
  if (!conversationId) return undefined;
  const [conv] = await db
    .select({ projectId: conversations.projectId })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  return conv?.projectId ?? undefined;
}
