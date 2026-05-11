"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { FEATURES } from "@/types/database";

export async function createTemplate(formData: FormData) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .single();

  const plan = (sub?.plan || "free") as keyof typeof FEATURES;
  if (!FEATURES[plan].customTemplate) {
    return { error: "Custom template hanya tersedia di plan Hengker" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const structureRaw = formData.get("structure") as string;

  let structure: Record<string, unknown>[] = [];
  try {
    structure = JSON.parse(structureRaw || "[]");
  } catch {
    return { error: "Format struktur template tidak valid" };
  }

  const { error } = await supabase.from("prd_templates").insert({
    user_id: user.id,
    name: name.trim(),
    description: description?.trim() || null,
    structure,
  });

  if (error) {
    return { error: "Gagal membuat template" };
  }

  revalidatePath("/settings/templates");
  return {};
}

export async function deleteTemplate(templateId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("prd_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Gagal menghapus template" };
  }

  revalidatePath("/settings/templates");
  return {};
}
