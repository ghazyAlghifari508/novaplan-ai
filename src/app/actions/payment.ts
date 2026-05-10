"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import type { Plan } from "@/types/database";

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY_SANDBOX!;
const MIDTRANS_API = "https://api.sandbox.midtrans.com/v2";

const PLAN_PRICES: Record<Plan, number> = {
  free: 0,
  pro: 25000,
  hengker: 100000,
};

export async function createTransaction(plan: Plan, isYearly: boolean) {
  const user = await requireAuth();
  const supabase = await createClient();

  const basePrice = PLAN_PRICES[plan];
  if (!basePrice || plan === "free") {
    throw new Error("Invalid plan");
  }

  const amount = isYearly ? Math.round(basePrice * 12 * 0.8) : basePrice;
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
        name: `NovaPlan ${plan.charAt(0).toUpperCase() + plan.slice(1)} ${isYearly ? "Tahunan" : "Bulanan"}`,
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

  await supabase.from("payments").insert({
    user_id: user.id,
    amount,
    status: "pending",
    midtrans_order_id: orderId,
    payment_method: "midtrans",
  });

  return { token: data.token, redirect_url: data.redirect_url, orderId };
}

export async function handlePaymentSuccess(orderId: string) {
  const supabase = await createClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("user_id, amount")
    .eq("midtrans_order_id", orderId)
    .single();

  if (!payment) return;

  const isHengker = payment.amount >= PLAN_PRICES.hengker;
  const plan: Plan = isHengker ? "hengker" : "pro";

  const monthEnd = new Date();
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  await supabase
    .from("payments")
    .update({ status: "success", paid_at: new Date().toISOString() })
    .eq("midtrans_order_id", orderId);

  await supabase
    .from("subscriptions")
    .upsert({
      user_id: payment.user_id,
      plan,
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: monthEnd.toISOString(),
      updated_at: new Date().toISOString(),
    });

  const quotaUpdate = {
    plan,
    prd_used: 0,
    prd_limit: plan === "hengker" ? -1 : 25,
    revision_used: 0,
    revision_limit: plan === "hengker" ? -1 : 20,
    reset_at: monthEnd.toISOString(),
    updated_at: new Date().toISOString(),
  };

  await supabase.from("quotas").upsert({
    user_id: payment.user_id,
    ...quotaUpdate,
  });

  return { plan, payment };
}