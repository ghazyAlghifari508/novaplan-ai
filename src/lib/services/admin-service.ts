import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { desc, eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";

async function adminDb() {
	const { db } = await import("@/db");
	const {
		users,
		subscriptions,
		sessions,
		projects,
		prdVersions,
		acVersions,
		tasks,
		feedback,
		errorReports,
		payments,
	} = await import("@/db/schema");
	return {
		db,
		users,
		subscriptions,
		sessions,
		projects,
		prdVersions,
		acVersions,
		tasks,
		feedback,
		errorReports,
		payments,
	};
}

export interface AdminDashboardMetrics {
	usersCount: number;
	projectsCount: number;
	prdCount: number;
	acCount: number;
	tasksCount: number;
	feedbackCount: number;
	errorCount: number;
	totalRevenue: number;
	planDistribution: { plan: string; count: number }[];
	recentProjects: {
		id: string;
		name: string;
		step: string | null;
		userName: string | null;
		userEmail: string | null;
		createdAt: Date | null;
	}[];
}

export const getAdminDashboardMetrics = createServerFn({
	method: "GET",
}).handler(async (): Promise<AdminDashboardMetrics> => {
	await requireAdmin(await getRequestHeaders());
	const {
		db,
		users,
		subscriptions,
		projects,
		prdVersions,
		acVersions,
		tasks,
		feedback,
		errorReports,
		payments,
	} = await adminDb();

	const [
		[userRow],
		[projectRow],
		[prdRow],
		[acRow],
		[taskRow],
		[fbRow],
		[errRow],
		[paymentRow],
		planRows,
		recentProjects,
	] = await Promise.all([
		db.select({ count: sql<number>`count(*)` }).from(users),
		db.select({ count: sql<number>`count(*)` }).from(projects),
		db.select({ count: sql<number>`count(*)` }).from(prdVersions),
		db.select({ count: sql<number>`count(*)` }).from(acVersions),
		db.select({ count: sql<number>`count(*)` }).from(tasks),
		db.select({ count: sql<number>`count(*)` }).from(feedback),
		db.select({ count: sql<number>`count(*)` }).from(errorReports),
		db
			.select({
				total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
			})
			.from(payments),
		db
			.select({
				plan: subscriptions.plan,
				count: sql<number>`count(*)`,
			})
			.from(subscriptions)
			.groupBy(subscriptions.plan),
		db
			.select({
				id: projects.id,
				name: projects.name,
				step: projects.step,
				userName: users.name,
				userEmail: users.email,
				createdAt: projects.createdAt,
			})
			.from(projects)
			.leftJoin(users, eq(users.id, projects.userId))
			.orderBy(desc(projects.createdAt))
			.limit(5),
	]);

	return {
		usersCount: Number(userRow?.count ?? 0),
		projectsCount: Number(projectRow?.count ?? 0),
		prdCount: Number(prdRow?.count ?? 0),
		acCount: Number(acRow?.count ?? 0),
		tasksCount: Number(taskRow?.count ?? 0),
		feedbackCount: Number(fbRow?.count ?? 0),
		errorCount: Number(errRow?.count ?? 0),
		totalRevenue: Number(paymentRow?.total ?? 0),
		planDistribution: planRows.map((p) => ({
			plan: p.plan,
			count: Number(p.count),
		})),
		recentProjects: recentProjects.map((p) => ({
			...p,
			createdAt: p.createdAt ? new Date(p.createdAt) : null,
		})),
	};
});

export const listUsers = createServerFn({ method: "GET" })
	.validator(
		(data: { limit?: number; offset?: number; search?: string } = {}) =>
			data ?? {},
	)
	.handler(async ({ data }) => {
		await requireAdmin(await getRequestHeaders());
		const { db, users, subscriptions } = await adminDb();
		const rows = await db
			.select({
				user: users,
				sub: subscriptions,
			})
			.from(users)
			.leftJoin(subscriptions, eq(subscriptions.userId, users.id))
			.orderBy(desc(users.createdAt))
			.limit(data.limit ?? 50)
			.offset(data.offset ?? 0);
		return rows;
	});

export const updateUserPlan = createServerFn({ method: "POST" })
	.validator(
		(data: { userId: string; plan: "free" | "pro" | "hengker" }) => data,
	)
	.handler(async ({ data }) => {
		await requireAdmin(await getRequestHeaders());
		const { db, subscriptions } = await adminDb();
		await db
			.update(subscriptions)
			.set({ plan: data.plan, status: "active", updatedAt: new Date() })
			.where(eq(subscriptions.userId, data.userId));
	});

export const setUserBanned = createServerFn({ method: "POST" })
	.validator((data: { userId: string; banned: boolean }) => data)
	.handler(async ({ data }) => {
		await requireAdmin(await getRequestHeaders());
		const { db, users, sessions } = await adminDb();
		await db
			.update(users)
			.set({
				bannedAt: data.banned ? new Date() : null,
				updatedAt: new Date(),
			})
			.where(eq(users.id, data.userId));
		if (data.banned) {
			await db.delete(sessions).where(eq(sessions.userId, data.userId));
		}
	});

export const resetUserCredit = createServerFn({ method: "POST" })
	.validator((data: { userId: string }) => data)
	.handler(async ({ data }) => {
		await requireAdmin(await getRequestHeaders());
		const { db, subscriptions } = await adminDb();
		await db
			.update(subscriptions)
			.set({ creditsUsed: 0, updatedAt: new Date() })
			.where(eq(subscriptions.userId, data.userId));
	});

export const setUserAdmin = createServerFn({ method: "POST" })
	.validator((data: { userId: string; isAdmin: boolean }) => data)
	.handler(async ({ data }) => {
		await requireAdmin(await getRequestHeaders());
		const { db, users } = await adminDb();
		await db
			.update(users)
			.set({ isAdmin: data.isAdmin, updatedAt: new Date() })
			.where(eq(users.id, data.userId));
	});

export const listFeedback = createServerFn({ method: "GET" })
	.validator((data: { type?: string } = {}) => data ?? {})
	.handler(async ({ data }) => {
		await requireAdmin(await getRequestHeaders());
		const { db, feedback, users } = await adminDb();
		const rows = await db
			.select({
				id: feedback.id,
				message: feedback.message,
				type: feedback.type,
				createdAt: feedback.createdAt,
				userEmail: users.email,
				userName: users.name,
			})
			.from(feedback)
			.leftJoin(users, eq(users.id, feedback.userId))
			.where(data.type ? eq(feedback.type, data.type) : undefined)
			.orderBy(desc(feedback.createdAt));
		return rows;
	});

export const listErrorReports = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireAdmin(await getRequestHeaders());
		const { db, errorReports, users } = await adminDb();
		const rows = await db
			.select({
				id: errorReports.id,
				errorMessage: errorReports.errorMessage,
				context: errorReports.context,
				createdAt: errorReports.createdAt,
				userEmail: users.email,
				userName: users.name,
			})
			.from(errorReports)
			.leftJoin(users, eq(users.id, errorReports.userId))
			.orderBy(desc(errorReports.createdAt));
		return rows;
	},
);

export const countUsers = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireAdmin(await getRequestHeaders());
		const { db, users } = await adminDb();
		const [row] = await db
			.select({ count: sql<number>`count(*)` })
			.from(users);
		return Number(row?.count ?? 0);
	},
);
