import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq, like } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";

async function adminDb() {
  const { db } = await import("@/db");
  const { users, subscriptions, sessions, feedback, errorReports } = await import("@/db/schema");
  return { db, users, subscriptions, sessions, feedback, errorReports };
}

export const listUsers = createServerFn({ method: "GET" })
  .validator((data: { limit?: number; offset?: number; search?: string } = {}) => data ?? {})
  .handler(async ({ data }) => {
    await requireAdmin(await getRequestHeaders());
    const { db, users, subscriptions } = await adminDb();
    const rows = await db
      .select({ user: users, sub: subscriptions })
      .from(users)
      .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
      .limit(data.limit ?? 50)
      .offset(data.offset ?? 0);
    return rows;
  });

export const updateUserPlan = createServerFn({ method: "POST" })
  .validator((data: { userId: string; plan: "free" | "pro" | "hengker" }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(await getRequestHeaders());
    const { db, subscriptions } = await adminDb();
    await db.update(subscriptions).set({ plan: data.plan, status: "active" }).where(eq(subscriptions.userId, data.userId));
  });

export const setUserBanned = createServerFn({ method: "POST" })
  .validator((data: { userId: string; banned: boolean }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(await getRequestHeaders());
    const { db, users, sessions } = await adminDb();
    await db.update(users).set({ bannedAt: data.banned ? new Date() : null }).where(eq(users.id, data.userId));
    if (data.banned) await db.delete(sessions).where(eq(sessions.userId, data.userId));
  });

export const resetUserCredit = createServerFn({ method: "POST" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(await getRequestHeaders());
    const { db, subscriptions } = await adminDb();
    // NOTE (open item spec §C.1): verify against src/lib/credits.ts rollover before shipping — raw creditsUsed=0 respects current rollover (credits.ts rollOverFreeIfNeeded also resets to 0 at period start). This is intentional minimal per plan.
    await db.update(subscriptions).set({ creditsUsed: 0 }).where(eq(subscriptions.userId, data.userId));
  });

export const setUserAdmin = createServerFn({ method: "POST" })
  .validator((data: { userId: string; isAdmin: boolean }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(await getRequestHeaders());
    const { db, users } = await adminDb();
    await db.update(users).set({ isAdmin: data.isAdmin }).where(eq(users.id, data.userId));
  });

export const listFeedback = createServerFn({ method: "GET" })
  .validator((data: { type?: string } = {}) => data ?? {})
  .handler(async ({ data }) => {
    await requireAdmin(await getRequestHeaders());
    const { db, feedback } = await adminDb();
    const rows = data.type
      ? await db.select().from(feedback).where(eq(feedback.type, data.type)).orderBy(desc(feedback.createdAt))
      : await db.select().from(feedback).orderBy(desc(feedback.createdAt));
    return rows;
  });

export const listErrorReports = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin(await getRequestHeaders());
  const { db, errorReports } = await adminDb();
  return db.select().from(errorReports).orderBy(desc(errorReports.createdAt));
});

export const countUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin(await getRequestHeaders());
  const { db, users } = await adminDb();
  const { sql } = await import("drizzle-orm");
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(users);
  return Number(row.count);
});
