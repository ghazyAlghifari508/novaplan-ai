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

export async function deleteAccount() {
  const user = await requireAuth();
  const admin = getAdminInsforge();

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
