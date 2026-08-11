import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { desc, eq } from "drizzle-orm";
import type { Plan } from "@/types/database";

// ponytail: NO top-level `import { db }` or `import { auth }` - those drag pg
// (→ Buffer) into the client bundle because routes import server fns from here
// and module-scope imports run on the client. Dynamic-import server-only deps
// inside handlers so the client graph stays clean.

// Raw session (nullable). Use inside other server fns / loaders.
export async function getSessionFromHeaders(headers: Headers) {
	const { auth } = await import("@/lib/auth");
	return auth.api.getSession({ headers });
}

export const getSession = createServerFn({ method: "GET" }).handler(() =>
	getSessionFromHeaders(getRequestHeaders()),
);

export const getUser = createServerFn({ method: "GET" }).handler(async () => {
	const session = await getSessionFromHeaders(getRequestHeaders());
	return session?.user ?? null;
});

// Throws Unauthorized when no session - for guarded server fns.
export async function requireUser(headers: Headers) {
	const session = await getSessionFromHeaders(headers);
	if (!session?.user) throw new Error("Unauthorized");
	return session.user;
}

/**
 * No-arg server fn guard for route beforeLoad/loader. Route files are
 * client-bundled so they can't import getRequestHeaders directly - call this.
 */
export const requireUserServer = createServerFn({ method: "GET" }).handler(
	async () => {
		return requireUser(getRequestHeaders());
	},
);

export const getUserProfile = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await getSessionFromHeaders(getRequestHeaders());
		if (!session?.user) return null;
		const { db } = await import("@/db");
		const { users } = await import("@/db/schema");
		const [profile] = await db
			.select()
			.from(users)
			.where(eq(users.id, session.user.id))
			.limit(1);
		return profile ?? null;
	},
);

// Plan + quota in one call (mirrors old getUserPlanAndQuota).
export const getUserPlanAndQuota = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await getSessionFromHeaders(getRequestHeaders());
		if (!session?.user) return { plan: "free" as Plan, quota: null };

		const { db } = await import("@/db");
		const { subscriptions, quotas } = await import("@/db/schema");
		const [subRows, quotaRows] = await Promise.all([
			db
				.select({ plan: subscriptions.plan, status: subscriptions.status })
				.from(subscriptions)
				.where(eq(subscriptions.userId, session.user.id))
				.orderBy(desc(subscriptions.createdAt))
				.limit(1),
			db
				.select()
				.from(quotas)
				.where(eq(quotas.userId, session.user.id))
				.orderBy(desc(quotas.createdAt))
				.limit(1),
		]);

		const sub = subRows[0];
		const plan = (sub?.status === "active" ? sub.plan : "free") as Plan;
		return { plan, quota: quotaRows[0] ?? null };
	},
);
