/**
 * Account/profile settings - ported to TanStack server fns.
 *
 * Schema/stack forks from the old InsForge version:
 * - users has `image` (Better Auth), not `avatar_url`; `fullName`/`role` app-owned.
 * - email/password are Better Auth-owned → go through auth.api, not raw DB writes.
 * - deleteAccount cascades manually (schema FKs have no ON DELETE CASCADE yet).
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/session";

const _updateProfile = createServerFn({ method: "POST" })
  .validator((d: { fullName: string; role: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser(getRequestHeaders());
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    await db
      .update(users)
      .set({ fullName: data.fullName, role: data.role, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  });

export async function updateProfile(formData: FormData) {
  await _updateProfile({
    data: {
      fullName: (formData.get("full_name") as string) ?? "",
      role: (formData.get("role") as string) ?? "",
    },
  });
}

const _updateEmail = createServerFn({ method: "POST" })
  .validator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    // Better Auth owns the email - changeEmail sends verification when enabled.
    const { auth } = await import("@/lib/auth");
    await auth.api.changeEmail({
      body: { newEmail: data.email },
      headers: getRequestHeaders(),
    });
  });

export async function updateEmail(formData: FormData) {
  await _updateEmail({ data: { email: (formData.get("email") as string) ?? "" } });
}

const _updatePassword = createServerFn({ method: "POST" })
  .validator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    // ponytail: no current-password field in the form → mirror old flow and send
    // a reset link (dev logs it, see auth.ts sendResetPassword). Wire in-form
    // changePassword when a current-password input is added.
    const { auth } = await import("@/lib/auth");
    await auth.api.requestPasswordReset({ body: { email: data.email } });
  });

export async function updatePassword(formData: FormData) {
  const user = await getUserEmail();
  if (user) await _updatePassword({ data: { email: user } });
}

const getUserEmail = createServerFn({ method: "GET" }).handler(async () => {
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  return session?.user.email ?? null;
});

const _deleteAccount = createServerFn({ method: "POST" })
  .validator((confirm: string) => {
    if (confirm !== "HAPUS") throw new Error("Konfirmasi penghapusan tidak valid.");
    return confirm;
  })
  .handler(async () => {
    const user = await requireUser(getRequestHeaders());
    const { db } = await import("@/db");
    const {
      notificationPreferences,
      payments,
      prdVersions,
      projects,
      quotas,
      rateLimits,
      subscriptions,
      users,
    } = await import("@/db/schema");
    const { auth } = await import("@/lib/auth");

    await db.delete(notificationPreferences).where(eq(notificationPreferences.userId, user.id));
    await db.delete(rateLimits).where(eq(rateLimits.userId, user.id));

    const userProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.userId, user.id));
    const projectIds = userProjects.map((p) => p.id);
    if (projectIds.length > 0) {
      await db.delete(prdVersions).where(inArray(prdVersions.projectId, projectIds));
    }
    await db.delete(projects).where(eq(projects.userId, user.id));
    await db.delete(payments).where(eq(payments.userId, user.id));
    await db.delete(subscriptions).where(eq(subscriptions.userId, user.id));
    await db.delete(quotas).where(eq(quotas.userId, user.id));

    await auth.api.signOut({ headers: getRequestHeaders() });
    await db.delete(users).where(eq(users.id, user.id));
  });

export async function deleteAccount(formData: FormData) {
  await _deleteAccount({ data: (formData.get("confirm") as string) ?? "" });
  window.location.assign("/");
}

export async function uploadAvatar(_formData: FormData) {
  // ponytail: old InsForge storage bucket has no replacement in the self-hosted
  // stack yet. Wire an object store (S3/local) + users.image update when ready.
  throw new Error("Upload avatar belum tersedia.");
}
