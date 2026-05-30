"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { novaPlanPlans } from "@/lib/pricing-data";
import type { Plan } from "@/types/database";

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY_SANDBOX!;
const MIDTRANS_API = "https://api.sandbox.midtrans.com/v2";

export async function createTransaction(plan: Plan, isYearly: boolean) {
  const user = await requireAuth();

  const { getAdminClient } = await import("@/lib/supabase/admin");
  const adminSupabase = getAdminClient();

  // Get plan data from the single source of truth
  const planData = novaPlanPlans.find((p) => p.id === plan);
  if (!planData || plan === "free") {
    throw new Error("Invalid plan");
  }

  const amount = isYearly ? planData.priceAnnually : planData.priceMonthly;
  if (amount === 0) {
    throw new Error("Plan gratis tidak memerlukan pembayaran.");
  }

  const orderId = `NOVAPLAN-${user.id.slice(0, 8)}-${Date.now()}`;

  const body = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    credit_card: { secure: true },
    item_details: [
      {
        id: plan,
        price: amount,
        quantity: 1,
        name: `NovaPlan ${planData.name} ${isYearly ? "Tahunan" : "Bulanan"}`,
      },
    ],
    customer_details: {
      first_name: user.email!.split("@")[0],
      email: user.email,
    },
  };

  const response = await fetch(`${MIDTRANS_API}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64")}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Midtrans error: ${error}`);
  }

  const data = await response.json();

  await adminSupabase.from("payments").insert({
    user_id: user.id,
    amount,
    currency: "IDR",
    status: "pending",
    midtrans_order_id: orderId,
    payment_method: "midtrans",
  });

  return { token: data.token, redirect_url: data.redirect_url, orderId };
}

/**
 * Called by webhook or syncPaymentStatus after Midtrans confirms payment.
 * Determines plan from the orderId's associated payment record.
 */
export async function handlePaymentSuccess(orderId: string) {
  const { getAdminClient } = await import("@/lib/supabase/admin");
  const supabase = getAdminClient();

  const { data: payment } = await supabase
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
  if (
    payment.amount === hengkerPlan?.priceMonthly ||
    payment.amount === hengkerPlan?.priceAnnually
  ) {
    plan = "hengker";
  } else if (
    payment.amount === proPlan?.priceMonthly ||
    payment.amount === proPlan?.priceAnnually
  ) {
    plan = "pro";
  } else {
    // Fallback: if amount > pro yearly, it's hengker
    plan = payment.amount > (proPlan?.priceAnnually || 0) ? "hengker" : "pro";
  }

  const now = new Date();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // 1. Update payment status
  const { error: paymentError } = await supabase
    .from("payments")
    .update({ status: "success", paid_at: now.toISOString() })
    .eq("midtrans_order_id", orderId);

  if (paymentError) {
    console.error("Failed to update payment status:", paymentError);
    throw paymentError;
  }

  // 2. Update or Insert subscription (replacing upsert to avoid 42P10 since user_id isn't unique-constrained)
  const subData = {
    user_id: payment.user_id,
    plan,
    status: "active",
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    updated_at: now.toISOString(),
  };

  const { data: existingSubs } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", payment.user_id)
    .order("created_at", { ascending: false })
    .limit(1);

  let subError;
  if (existingSubs && existingSubs.length > 0) {
    const res = await supabase.from("subscriptions").update(subData).eq("id", existingSubs[0].id);
    subError = res.error;
  } else {
    const res = await supabase.from("subscriptions").insert(subData);
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

  const { data: existingQuotas } = await supabase
    .from("quotas")
    .select("id")
    .eq("user_id", payment.user_id)
    .order("created_at", { ascending: false })
    .limit(1);

  let quotaError;
  if (existingQuotas && existingQuotas.length > 0) {
    const res = await supabase.from("quotas").update(quotaData).eq("id", existingQuotas[0].id);
    quotaError = res.error;
  } else {
    const res = await supabase.from("quotas").insert(quotaData);
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

  const { getAdminClient } = await import("@/lib/supabase/admin");
  const supabase = getAdminClient();

  const { data: payment } = await supabase
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
    const { data: sub } = await supabase
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