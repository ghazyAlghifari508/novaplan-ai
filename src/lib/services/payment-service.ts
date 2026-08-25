/**
 * Midtrans payment application - server-only DB logic.
 *
 * ponytail: split out of app/actions/payment.ts because that module is imported
 * by the client pricing-card (for the syncPaymentStatus server fn). Plain server
 * helpers here import `db` (→ pg → Buffer) which crashes the browser bundle.
 * Keep all db/Buffer-touching code out of any module a client component imports.
 *
 * Credit model: monthly subscription. A purchase SETS the plan's credit
 * allocation and (re)writes the billing period via computePurchaseGrant
 * (lib/billing.ts). Rows whose current_period_end stays NULL are legacy
 * one-time purchases honored until their credits run out.
 */
import { desc, eq } from "drizzle-orm";
import { computePurchaseGrant } from "@/lib/billing";
import { novaPlanPlans } from "@/lib/pricing-data";
import type { Plan } from "@/types/database";

export function planFromAmount(amount: number): Plan {
	const tier = novaPlanPlans.find((p) => p.id !== "free" && p.price === amount);
	// ponytail: fail loudly on unknown amount rather than misclassify the plan.
	if (!tier)
		throw new Error(`Payment amount ${amount} does not match any plan price`);
	return tier.id;
}

export function creditsForPlan(plan: Plan): number {
	return novaPlanPlans.find((p) => p.id === plan)?.credits ?? 0;
}

/**
 * Grants credits after Midtrans confirms. Idempotent: bails if already success.
 * Called by syncPaymentStatus + payments/webhook.
 */
export async function applyPaymentSuccess(orderId: string) {
	const { db } = await import("@/db");
	const { payments, subscriptions } = await import("@/db/schema");

	return db.transaction(async (tx) => {
		// Row lock: a second concurrent call for the same orderId BLOCKS here
		// until the first transaction commits, then re-reads status === success
		// and returns early instead of granting a second time.
		const [payment] = await tx
			.select()
			.from(payments)
			.where(eq(payments.orderId, orderId))
			.for("update")
			.limit(1);
		if (!payment) return null;
		if (payment.status === "success") return { plan: payment.plan as Plan };

		const plan = planFromAmount(payment.amount ?? 0);
		const now = new Date();

		// Re-read the CURRENT period end so an early renewal extends from the
		// still-active period instead of overlapping it (spec §6.1).
		const [existingSub] = await tx
			.select({
				id: subscriptions.id,
				currentPeriodEnd: subscriptions.currentPeriodEnd,
			})
			.from(subscriptions)
			.where(eq(subscriptions.userId, payment.userId))
			.orderBy(desc(subscriptions.createdAt))
			.limit(1);

		const grant = computePurchaseGrant({
			plan,
			now,
			activePeriodEnd: existingSub?.currentPeriodEnd ?? null,
		});

		if (existingSub) {
			await tx
				.update(subscriptions)
				.set({
					plan,
					status: "active",
					midtransOrderId: orderId,
					credits: grant.credits,
					creditsUsed: 0,
					currentPeriodStart: grant.periodStart,
					currentPeriodEnd: grant.periodEnd,
					cancelledAt: null,
					reminderCount: 0,
					updatedAt: now,
				})
				.where(eq(subscriptions.id, existingSub.id));
		} else {
			await tx.insert(subscriptions).values({
				id: crypto.randomUUID(),
				userId: payment.userId,
				plan,
				status: "active",
				midtransOrderId: orderId,
				credits: grant.credits,
				creditsUsed: 0,
				currentPeriodStart: grant.periodStart,
				currentPeriodEnd: grant.periodEnd,
				reminderCount: 0,
			});
		}

		// Mark success LAST so a retry re-runs the grant if it died mid-way.
		await tx
			.update(payments)
			.set({ status: "success", updatedAt: now })
			.where(eq(payments.orderId, orderId));
		return { plan };
	});
}
