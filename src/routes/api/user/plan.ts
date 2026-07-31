import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { quotas, subscriptions } from "@/db/schema";
import { getSessionFromHeaders } from "@/lib/session";
import type { Plan } from "@/types/database";

export const Route = createFileRoute("/api/user/plan")({
  server: {
    handlers: {
      GET: async () => {
        const session = await getSessionFromHeaders(getRequestHeaders());
        if (!session?.user) return Response.json({ authenticated: false, plan: "free" });

        const [subRows, quotaRows] = await Promise.all([
          db.select({ plan: subscriptions.plan, status: subscriptions.status }).from(subscriptions).where(eq(subscriptions.userId, session.user.id)).orderBy(desc(subscriptions.createdAt)).limit(1),
          db.select({ prdUsed: quotas.prdUsed, prdLimit: quotas.prdLimit, revisionUsed: quotas.revisionUsed, revisionLimit: quotas.revisionLimit }).from(quotas).where(eq(quotas.userId, session.user.id)).orderBy(desc(quotas.createdAt)).limit(1),
        ]);

        const sub = subRows[0];
        const plan = (sub?.status === "active" ? sub.plan : "free") as Plan;
        const quota = quotaRows[0] ?? null;
        const remaining = quota?.prdLimit === -1 ? "unlimited" : typeof quota?.prdLimit === "number" && typeof quota?.prdUsed === "number" ? Math.max(0, quota.prdLimit - quota.prdUsed) : null;

        return Response.json({ authenticated: true, plan, quota, remaining });
      },
    },
  },
});
