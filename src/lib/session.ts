import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import type { Plan } from "@/types/database";

// ponytail: NO top-level `import { db }` or `import { auth }` - those drag pg
// (→ Buffer) into the client bundle because routes import server fns from here
// and module-scope imports run on the client. Dynamic-import server-only deps
// inside handlers so the client graph stays clean.

// Raw session (nullable). Use inside other server fns / loaders.
export const getSessionFromHeaders = createServerOnlyFn(
	async (headers: Headers) => {
		const { auth } = await import("@/lib/auth");
		return auth.api.getSession({ headers });
	},
);

const getRequestHeadersServer = createServerOnlyFn(async () => {
	const { getRequestHeaders } = await import("@tanstack/react-start/server");
	return getRequestHeaders();
});

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
	const h = await getRequestHeadersServer();
	return getSessionFromHeaders(h);
});

// Throws Unauthorized when no session - for guarded server fns.
export const requireUser = createServerOnlyFn(async (headers?: Headers) => {
	const h = headers ?? (await getRequestHeadersServer());
	const session = await getSessionFromHeaders(h);
	if (!session?.user) throw new Error("Unauthorized");
	return session.user;
});

/**
 * No-arg server fn guard for route beforeLoad/loader. Route files are
 * client-bundled so they can't import getRequestHeaders directly - call this.
 */
export const requireUserServer = createServerFn({ method: "GET" }).handler(
	async () => {
		const h = await getRequestHeadersServer();
		return requireUser(h);
	},
);

// Plan + quota in one call (mirrors old getUserPlanAndQuota).
export const getUserPlanAndQuota = createServerFn({ method: "GET" }).handler(
	async () => {
		const h = await getRequestHeadersServer();
		const session = await getSessionFromHeaders(h);
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
