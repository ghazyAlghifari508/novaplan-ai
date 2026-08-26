import { and, desc, eq, like } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { getRequestHeaders } from "@tanstack/react-start/server";

async function adminDb() {
  const { db } = await import("@/db");
  const { users, subscriptions, sessions, feedback, errorReports } = await import("@/db/schema");
  return { db, users, subscriptions, sessions, feedback, errorReports };
}

export async function listUsers(opts: { limit?: number; offset?: number; search?: string } = {}) {
  await requireAdmin(getRequestHeaders());
  const { db, users, subscriptions } = await adminDb();
  const rows = await db
    .select({ user: users, sub: subscriptions })
    .from(users)
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
  return rows;
}

export async function updateUserPlan(userId: string, plan: "free" | "pro" | "hengker") {
  await requireAdmin(getRequestHeaders());
  const { db, subscriptions } = await adminDb();
  await db.update(subscriptions).set({ plan, status: "active" }).where(eq(subscriptions.userId, userId));
}

export async function setUserBanned(userId: string, banned: boolean) {
  await requireAdmin(getRequestHeaders());
  const { db, users, sessions } = await adminDb();
  await db.update(users).set({ bannedAt: banned ? new Date() : null }).where(eq(users.id, userId));
  if (banned) await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function resetUserCredit(userId: string) {
  await requireAdmin(getRequestHeaders());
  const { db, subscriptions } = await adminDb();
  // NOTE (open item spec §C.1): verify against src/lib/credits.ts rollover before shipping — raw creditsUsed=0 respects current rollover (credits.ts rollOverFreeIfNeeded also resets to 0 at period start). This is intentional minimal per plan.
  await db.update(subscriptions).set({ creditsUsed: 0 }).where(eq(subscriptions.userId, userId));
}

export async function setUserAdmin(userId: string, isAdmin: boolean) {
  await requireAdmin(getRequestHeaders());
  const { db, users } = await adminDb();
  await db.update(users).set({ isAdmin }).where(eq(users.id, userId));
}

export async function listFeedback(opts: { type?: string } = {}) {
  await requireAdmin(getRequestHeaders());
  const { db, feedback } = await adminDb();
  const rows = opts.type
    ? await db.select().from(feedback).where(eq(feedback.type, opts.type)).orderBy(desc(feedback.createdAt))
    : await db.select().from(feedback).orderBy(desc(feedback.createdAt));
  return rows;
}

export async function listErrorReports() {
  await requireAdmin(getRequestHeaders());
  const { db, errorReports } = await adminDb();
  return db.select().from(errorReports).orderBy(desc(errorReports.createdAt));
}

export async function countUsers(): Promise<number> {
  await requireAdmin(getRequestHeaders());
  const { db, users } = await adminDb();
  const { sql } = await import("drizzle-orm");
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(users);
  return Number(row.count);
}
