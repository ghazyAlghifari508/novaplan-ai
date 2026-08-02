import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { quotas, subscriptions } from "@/db/schema";

/**
 * Pro/Hengker subscriptions with a currentPeriodEnd in the past are expired.
 * Free plan has no period (currentPeriodEnd stays null) - always active.
 */
export async function checkSubscriptionActive(userId: string): Promise<boolean> {
  const [sub] = await db
    .select({ plan: subscriptions.plan, currentPeriodEnd: subscriptions.currentPeriodEnd })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (!sub || sub.plan === "free") return true;
  if (!sub.currentPeriodEnd) return true;
  return sub.currentPeriodEnd.getTime() > Date.now();
}

export async function checkQuota(
  userId: string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const [quota] = await db
    .select({ prdUsed: quotas.prdUsed, prdLimit: quotas.prdLimit })
    .from(quotas)
    .where(eq(quotas.userId, userId))
    .limit(1);

  // ponytail: fail closed - a missing row after signup-seed hook means
  // something is wrong, not "give unlimited access".
  if (!quota) return { allowed: false, used: 0, limit: 0 };
  if (quota.prdLimit === -1) {
    const active = await checkSubscriptionActive(userId);
    return { allowed: active, used: quota.prdUsed ?? 0, limit: -1 };
  }
  if (!(await checkSubscriptionActive(userId)))
    return { allowed: false, used: quota.prdUsed ?? 0, limit: quota.prdLimit ?? 0 };
  return {
    allowed: (quota.prdUsed ?? 0) < (quota.prdLimit ?? 0),
    used: quota.prdUsed ?? 0,
    limit: quota.prdLimit ?? 0,
  };
}

export async function incrementPrdCount(userId: string): Promise<void> {
  // No RPC in self-host PG - atomic SQL increment.
  await db.update(quotas).set({ prdUsed: sql`${quotas.prdUsed} + 1` }).where(eq(quotas.userId, userId));
}

export async function checkRevisionQuota(
  userId: string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const [quota] = await db
    .select({ revisionUsed: quotas.revisionUsed, revisionLimit: quotas.revisionLimit })
    .from(quotas)
    .where(eq(quotas.userId, userId))
    .limit(1);

  if (!quota) return { allowed: false, used: 0, limit: 0 };
  if (quota.revisionLimit === -1) {
    const active = await checkSubscriptionActive(userId);
    return { allowed: active, used: quota.revisionUsed ?? 0, limit: -1 };
  }
  if (!(await checkSubscriptionActive(userId)))
    return { allowed: false, used: quota.revisionUsed ?? 0, limit: quota.revisionLimit ?? 0 };
  return {
    allowed: (quota.revisionUsed ?? 0) < (quota.revisionLimit ?? 0),
    used: quota.revisionUsed ?? 0,
    limit: quota.revisionLimit ?? 0,
  };
}

export async function incrementRevisionCount(userId: string): Promise<void> {
  await db.update(quotas).set({ revisionUsed: sql`${quotas.revisionUsed} + 1` }).where(eq(quotas.userId, userId));
}
