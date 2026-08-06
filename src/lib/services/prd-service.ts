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
 * Synchronous regex-only project name derivation.
 * Instant, no AI call. Used at project creation for speed.
 * AI-quality name comes later via deriveProjectName() in chat.ts SSE stream.
 */
export function deriveProjectNameSync(message: string): string {
  let cleanMsg = message;
  cleanMsg = cleanMsg.replace(/Generate PRD lengkap berdasarkan informasi berikut:\s*/gi, "");
  cleanMsg = cleanMsg.replace(/\s*Gunakan section markers sesuai standar./gi, "");
  cleanMsg = cleanMsg.replace(/\[Platform:.*?\]\s*/gi, "");
  cleanMsg = cleanMsg.trim();

  const fillers = [
    "tolong", "coba", "bantu", "harap", "buatkan", "bikin", "generate",
    "tuliskan", "buat", "bikinin", "dong", "ya", "yaa",
    "gw", "saya", "kami", "aku", "gue",
    "sebuah", "satu", "suatu", "itu", "ini",
    "prd", "dokumen", "file",
    "untuk", "tentang", "dengan", "yang", "dan", "atau", "serta",
    "dari", "ke", "di", "pada", "adalah", "akan", "bisa", "juga",
    "the", "a", "an", "of", "and", "or", "for", "to", "in", "on",
    "with", "that", "this", "is", "are", "was", "be", "has", "have",
    "its", "it", "by", "from", "but", "not", "no", "so", "if",
    "membuat", "membangun", "menggunakan", "ada",
    "aplikasi", "website", "platform", "sistem", "web", "app",
    "apps", "mobile", "desktop", "software", "project", "proyek",
    "baru", "simple", "basic", "lengkap", "sederhana", "modern",
  ];
  let fallback = cleanMsg.replace(/\[.*?\]\s*/g, "");
  const fillerRegex = new RegExp(`\\b(?:${fillers.join("|")})\\b`, "gi");
  fallback = fallback.replace(fillerRegex, "").replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim();
  if (fallback.length < 2) return "Project Baru";
  const words = fallback.split(" ").filter((w) => w.length > 1);
  if (words.length === 0) return "Project Baru";
  const tail = words.slice(-4);
  return tail.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "Project Baru";
}

/**
 * Derive a human-readable project name from the user's raw prompt.
 * Uses AI to extract the core app concept, with regex fallback if AI fails.
 */
export async function deriveProjectName(message: string): Promise<string> {
  // Strip platform tags and known boilerplate
  let cleanMsg = message;
  cleanMsg = cleanMsg.replace(/Generate PRD lengkap berdasarkan informasi berikut:\s*/gi, "");
  cleanMsg = cleanMsg.replace(/\s*Gunakan section markers sesuai standar./gi, "");
  cleanMsg = cleanMsg.replace(/\[Platform:.*?\]\s*/gi, "");
  cleanMsg = cleanMsg.trim();

  // AI path: ask model to extract a short project title
  try {
    const { completeChat } = await import("@/lib/ai-client");
    const title = await completeChat(
      [
        {
          role: "system",
          content:
            "Extract a short project/app name (2-5 words) from the user's prompt. " +
            "Return ONLY the name, nothing else. No quotes, no punctuation, no explanation. " +
            "Use Title Case. Examples: 'Padel Booking', 'Kasir POS', 'LMS Gamifikasi', 'E-Commerce Marketplace'.",
        },
        { role: "user", content: cleanMsg },
      ],
      "oc/big-pickle",
    );
    const cleaned = title.trim().replace(/^["']|["']$/g, "").replace(/\.$/, "");
    if (cleaned.length >= 2 && cleaned.length <= 60) return cleaned;
  } catch {
    // Fall through to regex fallback
  }

  // Regex fallback: strip fillers, take last meaningful words
  const fillers = [
    "tolong", "coba", "bantu", "harap", "buatkan", "bikin", "generate",
    "tuliskan", "buat", "bikinin", "dong", "ya", "yaa",
    "gw", "saya", "kami", "aku", "gue",
    "sebuah", "satu", "suatu", "itu", "ini",
    "prd", "dokumen", "file",
    "untuk", "tentang", "dengan", "yang", "dan", "atau", "serta",
    "dari", "ke", "di", "pada", "adalah", "akan", "bisa", "juga",
    "the", "a", "an", "of", "and", "or", "for", "to", "in", "on",
    "with", "that", "this", "is", "are", "was", "be", "has", "have",
    "its", "it", "by", "from", "but", "not", "no", "so", "if",
    "membuat", "membangun", "menggunakan", "ada",
    "aplikasi", "website", "platform", "sistem", "web", "app",
    "apps", "mobile", "desktop", "software", "project", "proyek",
    "baru", "simple", "basic", "lengkap", "sederhana", "modern",
  ];
  let fallback = cleanMsg.replace(/\[.*?\]\s*/g, "");
  const fillerRegex = new RegExp(`\\b(?:${fillers.join("|")})\\b`, "gi");
  fallback = fallback.replace(fillerRegex, "").replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim();
  if (fallback.length < 2) return "Project Baru";
  const words = fallback.split(" ").filter((w) => w.length > 1);
  if (words.length === 0) return "Project Baru";
  const tail = words.slice(-4);
  return tail.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "Project Baru";
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
