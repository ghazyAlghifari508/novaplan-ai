import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { FEATURES, type Plan } from "@/types/database";

function normalizePlan(raw: string | null | undefined): Plan {
	return raw === "pro" || raw === "hengker" ? raw : "free";
}

/** AC / Task / Kanban access. Free tier is PRD-only. */
export function hasFullWorkflow(plan: Plan): boolean {
	return FEATURES[plan].fullWorkflow;
}

export async function getCreditBalance(userId: string): Promise<{
	plan: Plan;
	credits: number;
	creditsUsed: number;
	remaining: number;
}> {
	const [sub] = await db
		.select({
			plan: subscriptions.plan,
			status: subscriptions.status,
			credits: subscriptions.credits,
			creditsUsed: subscriptions.creditsUsed,
		})
		.from(subscriptions)
		.where(eq(subscriptions.userId, userId))
		.orderBy(desc(subscriptions.createdAt))
		.limit(1);

	// ponytail: fail closed - a missing row after the signup-seed hook means
	// something is wrong, not "give unlimited access".
	if (!sub) return { plan: "free", credits: 0, creditsUsed: 0, remaining: 0 };

	const plan = sub.status === "active" ? normalizePlan(sub.plan) : "free";
	const credits = sub.credits ?? 0;
	const creditsUsed = sub.creditsUsed ?? 0;
	return {
		plan,
		credits,
		creditsUsed,
		remaining: Math.max(0, credits - creditsUsed),
	};
}

export async function checkCredits(
	userId: string,
): Promise<{ allowed: boolean; remaining: number; plan: Plan }> {
	const { plan, remaining } = await getCreditBalance(userId);
	return { allowed: remaining > 0, remaining, plan };
}

/**
 * Atomically burns one credit. The `creditsUsed < credits` predicate lives in the
 * WHERE clause so two concurrent project creations cannot both pass a
 * read-then-write check and overdraw the balance.
 *
 * Returns false when there was nothing left to burn.
 */
export async function consumeCredit(userId: string): Promise<boolean> {
	const [latest] = await db
		.select({ id: subscriptions.id })
		.from(subscriptions)
		.where(eq(subscriptions.userId, userId))
		.orderBy(desc(subscriptions.createdAt))
		.limit(1);
	if (!latest) return false;

	const rows = await db
		.update(subscriptions)
		.set({
			creditsUsed: sql`${subscriptions.creditsUsed} + 1`,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(subscriptions.id, latest.id),
				sql`${subscriptions.creditsUsed} < ${subscriptions.credits}`,
			),
		)
		.returning({ id: subscriptions.id });

	return rows.length > 0;
}
