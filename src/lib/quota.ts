import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { quotas } from "@/db/schema";

// ponytail: new signup has no quotas row - default to fresh free tier so the
// first PRD generation isn't silently blocked.
const DEFAULT_PRD_LIMIT = 3;

export async function checkQuota(
  userId: string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const [quota] = await db
    .select({ prdUsed: quotas.prdUsed, prdLimit: quotas.prdLimit })
    .from(quotas)
    .where(eq(quotas.userId, userId))
    .limit(1);

  if (!quota) return { allowed: true, used: 0, limit: DEFAULT_PRD_LIMIT };
  if (quota.prdLimit === -1) return { allowed: true, used: quota.prdUsed ?? 0, limit: -1 };
  return { allowed: (quota.prdUsed ?? 0) < (quota.prdLimit ?? 0), used: quota.prdUsed ?? 0, limit: quota.prdLimit ?? 0 };
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
  if (quota.revisionLimit === -1) return { allowed: true, used: quota.revisionUsed ?? 0, limit: -1 };
  return { allowed: (quota.revisionUsed ?? 0) < (quota.revisionLimit ?? 0), used: quota.revisionUsed ?? 0, limit: quota.revisionLimit ?? 0 };
}
