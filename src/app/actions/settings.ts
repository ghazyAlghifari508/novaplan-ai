"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerInsforge } from "@/lib/insforge/server";
import { getAdminInsforge } from "@/lib/insforge/admin";
import { requireAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import { getAccessTokenCookieName, getRefreshTokenCookieName } from "@insforge/sdk/ssr";

export async function updateProfile(formData: FormData) {
  const user = await requireAuth();
  const insforge = await createServerInsforge();

  const fullName = formData.get("full_name") as string;
  const role = formData.get("role") as string;

  await insforge.database
    .from("users")
    .update({ full_name: fullName, role, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/settings/profile");
}

export async function updateEmail(formData: FormData) {
  await requireAuth();
  const insforge = await createServerInsforge();

  const email = formData.get("email") as string;

  // Update email in users table (InsForge doesn't have updateUser for email change)
  const { data } = await insforge.auth.getCurrentUser();
  if (data?.user) {
    await insforge.database
      .from("users")
      .update({ email, updated_at: new Date().toISOString() })
      .eq("id", data.user.id);
  }

  revalidatePath("/settings/account");
}

export async function updatePassword(formData: FormData) {
  await requireAuth();
  const insforge = await createServerInsforge();

  const password = formData.get("new_password") as string;

  // Use sendResetPasswordEmail + resetPassword flow, or
  // update via admin if available. For now, use auth.resetPassword
  // with the current session token.
  const { data } = await insforge.auth.getCurrentUser();
  if (data?.user) {
    // Send a reset password email to change the password
    await insforge.auth.sendResetPasswordEmail({
      email: data.user.email!,
    });
  }
}

export async function deleteAccount(formData: FormData) {
  const confirm = formData.get("confirm");
  if (confirm !== "HAPUS") {
    throw new Error("Konfirmasi penghapusan tidak valid.");
  }
  const user = await requireAuth();
  const admin = getAdminInsforge();

  // Delete related data before deleting user (cascade in order of dependency).
  // ponytail: if DB FK ON DELETE CASCADE is enabled, this is redundant but safe.
  await admin.database.from("feedback").delete().eq("user_id", user.id);
  await admin.database.from("rate_limits").delete().eq("user_id", user.id);
  await admin.database.from("notifications").delete().eq("user_id", user.id);
  await admin.database.from("notification_preferences").delete().eq("user_id", user.id);
  await admin.database.from("error_reports").delete().eq("user_id", user.id);
  // conversations + messages cascade via project delete below
  const { data: userProjects } = await admin.database.from("projects").select("id").eq("user_id", user.id);
  if (userProjects) {
    for (const p of userProjects) {
      await admin.database.from("prd_versions").delete().eq("project_id", p.id);
    }
  }
  await admin.database.from("projects").delete().eq("user_id", user.id);
  await admin.database.from("payments").delete().eq("user_id", user.id);
  await admin.database.from("subscriptions").delete().eq("user_id", user.id);
  await admin.database.from("quotas").delete().eq("user_id", user.id);

  // Delete user data from database
  await admin.database.from("users").delete().eq("id", user.id);

  // Sign out and clear cookie
  const insforge = await createServerInsforge();
  await insforge.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(getAccessTokenCookieName());
  cookieStore.delete(getRefreshTokenCookieName());

  redirect("/");
}

export async function uploadAvatar(formData: FormData) {
  const user = await requireAuth();
  const insforge = await createServerInsforge();

  const file = formData.get("avatar") as File;
  if (!file || file.size === 0) return;

  // Validate MIME type to prevent SVG XSS, binaries, etc.
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Tipe file tidak didukung. Gunakan JPEG, PNG, WebP, atau GIF.");
  }

  // Limit upload size to 5MB
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("Ukuran file maksimal 5MB.");
  }

  const ext = file.name.split(".").pop() || "png";
  const path = `${user.id}/avatar.${ext}`;

  const { data: uploadData } = await insforge.storage
    .from("avatars")
    .upload(path, file);

  if (uploadData?.url) {
    await insforge.database
      .from("users")
      .update({
        avatar_url: uploadData.url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  revalidatePath("/settings/profile");
}
