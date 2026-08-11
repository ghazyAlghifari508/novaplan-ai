import { randomBytes } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { isValidHistoryUrl } from "@/lib/flow-progress";
import { novaPlanPlans } from "@/lib/pricing-data";
import { requireUser } from "@/lib/session";

const ALLOWED_ORIGINS = [
	"https://novaplanai.vercel.app",
	"https://novaplanai-git-main-ghazy-alghifaris-projects.vercel.app",
	"http://localhost:3000",
];

export const Route = createFileRoute("/api/payments/create")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const user = await requireUser(getRequestHeaders());
				const { planId, returnUrl, projectId } = (await request.json()) as {
					planId: string;
					returnUrl?: string;
					projectId?: string;
				};

				const plan = novaPlanPlans.find((p) => p.id === planId);
				if (!plan)
					return Response.json(
						{ error: "Plan tidak ditemukan." },
						{ status: 404 },
					);
				const price = plan.price;
				if (price === 0)
					return Response.json(
						{ error: "Plan gratis tidak memerlukan pembayaran." },
						{ status: 400 },
					);

				// ponytail: no plan-hierarchy guard - credits are additive, so buying the
				// same or a lower tier again is a legitimate top-up.

				// Clean up stale pending payments for this user (>5 min) before
				// creating a new one. Prevents stacking abandoned checkouts.
				const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
				await db
					.update(payments)
					.set({ status: "failed" })
					.where(
						and(
							eq(payments.userId, user.id),
							eq(payments.status, "pending"),
							lt(payments.createdAt, fiveMinAgo),
						),
					);

				const orderId = `ORDER-${Date.now()}-${randomBytes(4).toString("hex")}`;
				await db.insert(payments).values({
					id: crypto.randomUUID(),
					userId: user.id,
					orderId,
					plan: planId,
					amount: price,
					status: "pending",
				});

				const origin = request.headers.get("origin") || "";
				const safeOrigin = ALLOWED_ORIGINS.includes(origin)
					? origin
					: ALLOWED_ORIGINS[0];
				const serverKey = process.env.MIDTRANS_SERVER_KEY_SANDBOX || "";
				const authString = Buffer.from(`${serverKey}:`).toString("base64");

				const parameters = {
					transaction_details: { order_id: orderId, gross_amount: price },
					customer_details: {
						first_name: user.name || "Customer",
						email: user.email,
					},
					item_details: [
						{
							id: planId,
							price,
							quantity: 1,
							name: `Paket ${plan.name} - ${plan.credits} kredit`,
						},
					],
					custom_field1: planId,
					custom_field2: String(plan.credits),
					custom_field3: user.id,
					callbacks: {
						finish: (() => {
							const finishPath =
								returnUrl &&
								projectId &&
								isValidHistoryUrl(returnUrl, projectId)
									? returnUrl
									: "/pricing";
							return `${safeOrigin}${finishPath}${finishPath.includes("?") ? "&" : "?"}payment=success&order_id=${orderId}`;
						})(),
					},
				};

				try {
					const response = await fetch(
						"https://app.sandbox.midtrans.com/snap/v1/transactions",
						{
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Accept: "application/json",
								Authorization: `Basic ${authString}`,
								"X-Override-Notification": `${safeOrigin}/api/payments/webhook`,
							},
							body: JSON.stringify(parameters),
						},
					);
					if (!response.ok) throw new Error(await response.text());
					const transaction = await response.json();
					return Response.json({
						redirect_url: transaction.redirect_url,
						token: transaction.token,
					});
				} catch (error) {
					console.error("Midtrans/System Error:", error);
					await db.delete(payments).where(eq(payments.orderId, orderId));
					return Response.json(
						{
							error:
								"Terjadi kesalahan pada sistem pembayaran. Silakan coba lagi.",
						},
						{ status: 500 },
					);
				}
			},
		},
	},
});
