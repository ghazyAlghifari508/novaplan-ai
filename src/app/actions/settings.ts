"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function updateProfile(formData: FormData) {
  const user = await requireAuth();
  const supabase = await createClient();

  const fullName = formData.get("full_name") as string;
  const role = formData.get("role") as string;

  await supabase
    .from("users")
    .update({ full_name: fullName, role, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/settings/profile");
}

export async function updateEmail(formData: FormData) {
  const supabase = await createClient();
  await requireAuth();

  const email = formData.get("email") as string;
  await supabase.auth.updateUser({ email });
  revalidatePath("/settings/account");
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  await requireAuth();

  const password = formData.get("new_password") as string;
  await supabase.auth.updateUser({ password });
}

export async function deleteAccount() {
  const user = await requireAuth();
  const supabase = await createClient();

  await supabase.from("users").delete().eq("id", user.id);
  await supabase.auth.admin.deleteUser(user.id);

  await supabase.auth.signOut();
  redirect("/");
}

export async function uploadAvatar(formData: FormData) {
  const user = await requireAuth();
  const supabase = await createClient();

  const file = formData.get("avatar") as File;
  if (!file || file.size === 0) return;

  const ext = file.name.split(".").pop() || "png";
  const path = `${user.id}/avatar.${ext}`;

  await supabase.storage.from("avatars").upload(path, file, { upsert: true });

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

  await supabase
    .from("users")
    .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/settings/profile");
}