"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { FEATURES } from "@/types/database";
import crypto from "crypto";

function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `nvp_${crypto.randomBytes(32).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 10);
  return { raw, hash, prefix };
}

export async function createApiKey(name: string): Promise<{ key?: string; error?: string }> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .single();

  const plan = (sub?.plan || "free") as keyof typeof FEATURES;
  if (!FEATURES[plan].apiAccess) {
    return { error: "API access hanya tersedia di plan Hengker" };
  }

  const { count } = await supabase
    .from("api_keys")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("revoked_at", null);

  if ((count || 0) >= 5) {
    return { error: "Maksimal 5 API key aktif" };
  }

  const { raw, hash, prefix } = generateApiKey();

  const { error } = await supabase.from("api_keys").insert({
    user_id: user.id,
    name: name.trim(),
    key_hash: hash,
    key_prefix: prefix,
  });

  if (error) {
    return { error: "Gagal membuat API key" };
  }

  revalidatePath("/settings/api");
  return { key: raw };
}

export async function revokeApiKey(keyId: string): Promise<{ error?: string }> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Gagal revoke API key" };
  }

  revalidatePath("/settings/api");
  return {};
}

export async function validateApiKey(apiKey: string): Promise<{ userId: string; keyId: string; error?: string }> {
  const supabase = await createClient();
  const hash = crypto.createHash("sha256").update(apiKey).digest("hex");

  const { data: keyRecord } = await supabase
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", hash)
    .single();

  if (!keyRecord || keyRecord.revoked_at) {
    return { userId: "", keyId: "", error: "Invalid or revoked API key" };
  }

  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", hash);

  return { userId: keyRecord.user_id, keyId: keyRecord.id };
}
