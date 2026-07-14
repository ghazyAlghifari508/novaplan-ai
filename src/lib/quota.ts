import { createServerInsforge } from "@/lib/insforge/server";

// ponytail: a new user (just signup) won't have a `quotas` row yet — the
// signup flow doesn't bootstrap one. Default to fresh free tier so their
// first PRD generation isn't silently blocked.
const DEFAULT_PRD_LIMIT = 3;

export async function checkQuota(
  userId: string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const insforge = await createServerInsforge();

  const { data: quota } = await insforge.database
    .from("quotas")
    .select("prd_used, prd_limit, reset_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!quota) {
    return { allowed: true, used: 0, limit: DEFAULT_PRD_LIMIT };
  }

  if (quota.prd_limit === -1) {
    return { allowed: true, used: quota.prd_used, limit: -1 };
  }

  return {
    allowed: quota.prd_used < quota.prd_limit,
    used: quota.prd_used,
    limit: quota.prd_limit,
  };
}

export async function incrementPrdCount(userId: string): Promise<void> {
  const insforge = await createServerInsforge();

  const { error } = await insforge.database.rpc("increment_prd_used", { user_id_param: userId });
  if (error) {
    console.error("Failed to increment PRD count via RPC:", error);
    throw error;
  }
}

export async function checkRevisionQuota(
  userId: string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const insforge = await createServerInsforge();

  const { data: quota } = await insforge.database
    .from("quotas")
    .select("revision_used, revision_limit")
    .eq("user_id", userId)
    .maybeSingle();

  if (!quota) {
    return { allowed: false, used: 0, limit: 0 };
  }

  if (quota.revision_limit === -1) {
    return { allowed: true, used: quota.revision_used, limit: -1 };
  }

  return {
    allowed: quota.revision_used < quota.revision_limit,
    used: quota.revision_used,
    limit: quota.revision_limit,
  };
}