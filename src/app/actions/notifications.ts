"use server";

import { revalidatePath } from "next/cache";
import { createServerInsforge } from "@/lib/insforge/server";
import { requireAuth } from "@/lib/auth";

export async function updateNotificationPreferences(formData: FormData) {
  const user = await requireAuth();
  const insforge = await createServerInsforge();

  const quotaWarning = formData.get("quota_warning") === "on";
  const prdCompleted = formData.get("prd_completed") === "on";
  const paymentUpdates = formData.get("payment_updates") === "on";
  const productUpdates = formData.get("product_updates") === "on";

  await insforge.database
    .from("notification_preferences")
    .upsert({
      user_id: user.id,
      quota_warning: quotaWarning,
      prd_completed: prdCompleted,
      payment_updates: paymentUpdates,
      product_updates: productUpdates,
      updated_at: new Date().toISOString(),
    });

  revalidatePath("/settings/notifications");
}
