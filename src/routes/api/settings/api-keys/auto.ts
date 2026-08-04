import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { requireUser } from "@/lib/session";

const ALL_SCOPES = ["read:project", "write:task:status", "write:subtask:status"];

export const Route = createFileRoute("/api/settings/api-keys/auto")({
  server: {
    handlers: {
      POST: async () => {
        const user = await requireUser(getRequestHeaders());

        // Delete existing auto-generated key (raw key not retrievable, must recreate)
        const existing = await db
          .select({ id: apiKeys.id })
          .from(apiKeys)
          .where(and(eq(apiKeys.userId, user.id), like(apiKeys.name, "auto-cli-%")))
          .limit(1);

        if (existing.length > 0) {
          await db.delete(apiKeys).where(eq(apiKeys.id, existing[0].id));
        }

        const rawKey = `novaplan_${randomBytes(32).toString("hex")}`;
        const keyHash = createHash("sha256").update(rawKey).digest("hex");
        const keyPrefix = rawKey.slice(0, 10);

        const [inserted] = await db
          .insert(apiKeys)
          .values({
            id: crypto.randomUUID(),
            userId: user.id,
            name: `auto-cli-${Date.now()}`,
            key: keyHash,
            keyPrefix,
            scopes: ALL_SCOPES,
          })
          .returning({ id: apiKeys.id });

        if (!inserted) return Response.json({ error: "Gagal membuat API key" }, { status: 500 });
        return Response.json({ rawKey });
      },
    },
  },
});
