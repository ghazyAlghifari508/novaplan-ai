/**
 * Midtrans payment application - server-only DB logic.
 *
 * ponytail: split out of app/actions/payment.ts because that module is imported
 * by the client pricing-card (for the syncPaymentStatus server fn). Plain server
 * helpers here import `db` (→ pg → Buffer) which crashes the browser bundle.
 * Keep all db/Buffer-touching code out of any module a client component imports.
 *
 * Credit model: one-time purchase, credits are additive and never expire, so
 * there are no period columns and nothing writes to the legacy quotas table.
 */
import { desc, eq, sql } from "drizzle-orm";
import { novaPlanPlans } from "@/lib/pricing-data";
import type { Plan } from "@/types/database";

/** Higher wins. Buying a cheaper pack must never downgrade an existing tier. */
const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, hengker: 2 };

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
		const credits = creditsForPlan(plan);
		const now = new Date();

		const [existingSub] = await tx
			.select({ id: subscriptions.id, plan: subscriptions.plan })
			.from(subscriptions)
			.where(eq(subscriptions.userId, payment.userId))
			.orderBy(desc(subscriptions.createdAt))
			.limit(1);

		if (existingSub) {
			const current = (existingSub.plan ?? "free") as Plan;
			const nextPlan =
				PLAN_RANK[plan] >= (PLAN_RANK[current] ?? 0) ? plan : current;
			await tx
				.update(subscriptions)
				.set({
					plan: nextPlan,
					status: "active",
					midtransOrderId: orderId,
					// Additive: a Pro user buying Pro again gets 10 more, not a reset to 10.
					credits: sql`${subscriptions.credits} + ${credits}`,
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
				credits,
				creditsUsed: 0,
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
