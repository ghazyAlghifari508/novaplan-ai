import { createServerInsforge } from "@/lib/insforge/server";

export async function checkQuota(
  userId: string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const insforge = await createServerInsforge();

  const { data: quota } = await insforge.database
    .from("quotas")
    .select("prd_used, prd_limit, reset_at")
    .eq("user_id", userId)
    .single();

  if (!quota) {
    return { allowed: false, used: 0, limit: 0 };
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

  await insforge.database.rpc("increment_prd_used", { user_id_param: userId });
}

export async function checkRevisionQuota(
  userId: string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const insforge = await createServerInsforge();

  const { data: quota } = await insforge.database
    .from("quotas")
    .select("revision_used, revision_limit")
    .eq("user_id", userId)
    .single();

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