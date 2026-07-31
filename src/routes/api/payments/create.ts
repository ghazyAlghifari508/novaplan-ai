import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, subscriptions } from "@/db/schema";
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
        const { planId, cycle } = await request.json();

        if (!planId || !cycle || (cycle !== "monthly" && cycle !== "annually")) {
          return Response.json({ error: "Plan atau cycle tidak valid." }, { status: 400 });
        }

        const plan = novaPlanPlans.find((p) => p.id === planId);
        if (!plan) return Response.json({ error: "Plan tidak ditemukan." }, { status: 404 });
        const price = cycle === "monthly" ? plan.priceMonthly : plan.priceAnnually;
        if (price === 0) return Response.json({ error: "Plan gratis tidak memlukan pembayaran." }, { status: 400 });

        const [currentSub] = await db.select({ plan: subscriptions.plan, status: subscriptions.status }).from(subscriptions).where(eq(subscriptions.userId, user.id)).orderBy(desc(subscriptions.createdAt)).limit(1);
        const currentPlan = currentSub?.status === "active" ? currentSub.plan : "free";

        const hierarchy: Record<string, number> = { free: 0, pro: 1, hengker: 2 };
        if ((hierarchy[currentPlan] ?? 0) >= (hierarchy[planId] ?? 0)) {
          return Response.json({ error: `Anda sudah berlangganan paket ${currentPlan}. Tidak bisa membeli paket yang sama atau lebih rendah.` }, { status: 400 });
        }

        const orderId = `ORDER-${Date.now()}-${randomBytes(4).toString("hex")}`;
        await db.insert(payments).values({ id: crypto.randomUUID(), userId: user.id, orderId, plan: planId, amount: price, status: "pending" });

        const origin = request.headers.get("origin") || "";
        const safeOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
        const serverKey = process.env.MIDTRANS_SERVER_KEY_SANDBOX || "";
        const authString = Buffer.from(`${serverKey}:`).toString("base64");

        const parameters = {
          transaction_details: { order_id: orderId, gross_amount: price },
          customer_details: { first_name: user.name || "Customer", email: user.email },
          item_details: [{ id: planId, price, quantity: 1, name: `Langganan Paket ${plan.name} (${cycle})` }],
          custom_field1: planId,
          custom_field2: cycle,
          custom_field3: user.id,
          callbacks: { finish: `${safeOrigin}/pricing?payment=success&order_id=${orderId}` },
        };

        try {
          const response = await fetch("https://app.sandbox.midtrans.com/snap/v1/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Basic ${authString}`, "X-Override-Notification": `${safeOrigin}/api/payments/webhook` },
            body: JSON.stringify(parameters),
          });
          if (!response.ok) throw new Error(await response.text());
          const transaction = await response.json();
          return Response.json({ redirect_url: transaction.redirect_url, token: transaction.token });
        } catch (error) {
          console.error("Midtrans/System Error:", error);
          await db.delete(payments).where(eq(payments.orderId, orderId));
          return Response.json({ error: "Terjadi kesalahan pada sistem pembayaran. Silakan coba lagi." }, { status: 500 });
        }
      },
    },
  },
});
