/**
 * Midtrans payment application - server-only DB logic.
 *
 * ponytail: split out of app/actions/payment.ts because that module is imported
 * by the client pricing-card (for the syncPaymentStatus server fn). Plain server
 * helpers here import `db` (→ pg → Buffer) which crashes the browser bundle.
 * Keep all db/Buffer-touching code out of any module a client component imports.
 *
 * Schema fork from old InsForge (columns collapsed in the new flat schema):
 * - payments: `midtrans_order_id` → `orderId`; status stays pending|success.
 * - subscriptions: no period columns → only plan/status/orderId set.
 * - quotas: no `plan`/`reset_at` columns → set usage/limits only.
 */
import { desc, eq } from "drizzle-orm";
import { novaPlanPlans } from "@/lib/pricing-data";
import { PLAN_LIMITS, type Plan } from "@/types/database";

export function planFromAmount(amount: number): Plan {
  const hengker = novaPlanPlans.find((p) => p.id === "hengker");
  const pro = novaPlanPlans.find((p) => p.id === "pro");
  if (amount === hengker?.priceMonthly || amount === hengker?.priceAnnually) return "hengker";
  if (amount === pro?.priceMonthly || amount === pro?.priceAnnually) return "pro";
  // ponytail: fail loudly on unknown amount rather than misclassify the plan.
  throw new Error(`Payment amount ${amount} does not match any plan price`);
}

/**
 * Applies plan/quota after Midtrans confirms. Idempotent: bails if already success.
 * Called by syncPaymentStatus + payments/webhook.
 */
export async function applyPaymentSuccess(orderId: string) {
  const { db } = await import("@/db");
  const { payments, quotas, subscriptions } = await import("@/db/schema");
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .limit(1);
  if (!payment) return null;
  if (payment.status === "success") return { plan: payment.plan as Plan };

  const plan = planFromAmount(payment.amount ?? 0);
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Upsert subscription (latest row for user, else insert).
  const [existingSub] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.userId, payment.userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  if (existingSub) {
    await db
      .update(subscriptions)
      .set({
        plan,
        status: "active",
        midtransOrderId: orderId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, existingSub.id));
  } else {
    await db.insert(subscriptions).values({
      id: crypto.randomUUID(),
      userId: payment.userId,
      plan,
      status: "active",
      midtransOrderId: orderId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });
  }

  // Upsert quota.
  const limits = PLAN_LIMITS[plan];
  const [existingQuota] = await db
    .select({ id: quotas.id })
    .from(quotas)
    .where(eq(quotas.userId, payment.userId))
    .orderBy(desc(quotas.createdAt))
    .limit(1);
  if (existingQuota) {
    await db
      .update(quotas)
      .set({ prdUsed: 0, prdLimit: limits.prd, revisionUsed: 0, revisionLimit: limits.revision, updatedAt: now })
      .where(eq(quotas.id, existingQuota.id));
  } else {
    await db.insert(quotas).values({
      id: crypto.randomUUID(),
      userId: payment.userId,
      prdUsed: 0,
      prdLimit: limits.prd,
      revisionUsed: 0,
      revisionLimit: limits.revision,
    });
  }

  // Mark success LAST so a retry re-runs sub/quota if it died mid-way.
  await db.update(payments).set({ status: "success", updatedAt: now }).where(eq(payments.orderId, orderId));
  return { plan };
}
