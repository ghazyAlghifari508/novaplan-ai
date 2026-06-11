"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { novaPlanPlans, type BillingCycle } from "@/lib/pricing-data";
import type { Plan } from "@/types/database";

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY_SANDBOX!;
const MIDTRANS_API = "https://api.sandbox.midtrans.com/v2";


/**
 * Called by webhook or syncPaymentStatus after Midtrans confirms payment.
 * Determines plan from the orderId's associated payment record.
 */
export async function handlePaymentSuccess(orderId: string) {
  const { getAdminInsforge } = await import("@/lib/insforge/admin");
  const admin = getAdminInsforge();

  const { data: payment } = await admin.database
    .from("payments")
    .select("user_id, amount, status")
    .eq("midtrans_order_id", orderId)
    .single();

  if (!payment) return;
  
  if (payment.status === "success") {
    console.log(`Payment ${orderId} already processed, skipping quota reset.`);
    return { plan: "already_processed" as Plan, payment };
  }

  // Determine plan by matching exact amounts from pricing-data (single source of truth)
  const hengkerPlan = novaPlanPlans.find((p) => p.id === "hengker");
  const proPlan = novaPlanPlans.find((p) => p.id === "pro");

  let plan: Plan;
  let billingCycle: BillingCycle = "monthly";
  if (
    payment.amount === hengkerPlan?.priceMonthly ||
    payment.amount === hengkerPlan?.priceAnnually
  ) {
    plan = "hengker";
    billingCycle = payment.amount === hengkerPlan?.priceAnnually ? "annually" : "monthly";
  } else if (
    payment.amount === proPlan?.priceMonthly ||
    payment.amount === proPlan?.priceAnnually
  ) {
    plan = "pro";
    billingCycle = payment.amount === proPlan?.priceAnnually ? "annually" : "monthly";
  } else {
    // Fallback: if amount > pro yearly, it's hengker
    plan = payment.amount > (proPlan?.priceAnnually || 0) ? "hengker" : "pro";
  }

  const now = new Date();
  const periodEnd = new Date(now);
  if (billingCycle === "annually") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // 1. Update payment status
  const { error: paymentError } = await admin.database
    .from("payments")
    .update({ status: "success", paid_at: now.toISOString() })
    .eq("midtrans_order_id", orderId);

  if (paymentError) {
    console.error("Failed to update payment status:", paymentError);
    throw paymentError;
  }

  // 2. Update or Insert subscription
  const subData = {
    user_id: payment.user_id,
    plan,
    status: "active",
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    updated_at: now.toISOString(),
  };

  const { data: existingSubs } = await admin.database
    .from("subscriptions")
    .select("id")
    .eq("user_id", payment.user_id)
    .order("created_at", { ascending: false })
    .limit(1);

  let subError;
  if (existingSubs && existingSubs.length > 0) {
    const res = await admin.database.from("subscriptions").update(subData).eq("id", existingSubs[0].id);
    subError = res.error;
  } else {
    const res = await admin.database.from("subscriptions").insert([subData]);
    subError = res.error;
  }

  if (subError) {
    console.error("Failed to update/insert subscription:", subError);
    throw subError;
  }

  // 3. Update or Insert quota
  const quotaData = {
    user_id: payment.user_id,
    plan,
    prd_used: 0,
    prd_limit: plan === "hengker" ? -1 : 25,
    revision_used: 0,
    revision_limit: plan === "hengker" ? -1 : 20,
    reset_at: periodEnd.toISOString(),
    updated_at: now.toISOString(),
  };

  const { data: existingQuotas } = await admin.database
    .from("quotas")
    .select("id")
    .eq("user_id", payment.user_id)
    .order("created_at", { ascending: false })
    .limit(1);

  let quotaError;
  if (existingQuotas && existingQuotas.length > 0) {
    const res = await admin.database.from("quotas").update(quotaData).eq("id", existingQuotas[0].id);
    quotaError = res.error;
  } else {
    const res = await admin.database.from("quotas").insert([quotaData]);
    quotaError = res.error;
  }

  if (quotaError) {
    console.error("Failed to update/insert quota:", quotaError);
    throw quotaError;
  }

  // 4. Bust all server-side caches
  revalidatePath("/", "layout");
  revalidatePath("/settings", "layout");
  revalidatePath("/prd", "layout");

  return { plan, payment };
}

/**
 * Called client-side after Midtrans redirect. Verifies with Midtrans API
 * then triggers handlePaymentSuccess if confirmed.
 */
export async function syncPaymentStatus(orderId: string) {
  const user = await requireAuth();

  const { getAdminInsforge } = await import("@/lib/insforge/admin");
  const admin = getAdminInsforge();

  const { data: payment } = await admin.database
    .from("payments")
    .select("*")
    .eq("midtrans_order_id", orderId)
    .single();

  if (!payment) {
    throw new Error("Payment not found");
  }

  if (payment.user_id !== user.id) {
    throw new Error("Unauthorized");
  }

  if (payment.status === "success") {
    // Already processed - just figure out the plan from subscriptions
    const { data: sub } = await admin.database
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .single();
    return { success: true, plan: sub?.plan || "pro", message: "Already synced" };
  }

  // Verify with Midtrans API
  const serverKey = process.env.MIDTRANS_SERVER_KEY_SANDBOX!;
  const authString = Buffer.from(`${serverKey}:`).toString("base64");

  const response = await fetch(`${MIDTRANS_API}/${orderId}/status`, {
    headers: {
      Authorization: `Basic ${authString}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch status from Midtrans");
  }

  const data = await response.json();
  const successStatuses = ["settlement", "capture"];

  if (successStatuses.includes(data.transaction_status)) {
    const result = await handlePaymentSuccess(orderId);
    return { success: true, updated: true, plan: result?.plan };
  }

  return { success: false, status: data.transaction_status };
}
