"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function updateNotificationPreferences(formData: FormData) {
  const user = await requireAuth();
  const supabase = await createClient();

  const quotaWarning = formData.get("quota_warning") === "on";
  const prdCompleted = formData.get("prd_completed") === "on";
  const paymentUpdates = formData.get("payment_updates") === "on";
  const productUpdates = formData.get("product_updates") === "on";

  await supabase
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
