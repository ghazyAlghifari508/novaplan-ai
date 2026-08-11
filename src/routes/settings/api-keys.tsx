import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import { ApiKeysClient } from "@/components/settings/api-keys-client";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { requireUserServer } from "@/lib/session";

// ponytail: server-only db logic - loader runs on client too, must not import db there.
const loadApiKeys = createServerFn({ method: "GET" }).handler(async () => {
	const user = await requireUserServer();
	const rows = await db
		.select({
			id: apiKeys.id,
			name: apiKeys.name,
			keyPrefix: apiKeys.keyPrefix,
			scopes: apiKeys.scopes,
			lastUsedAt: apiKeys.lastUsedAt,
			createdAt: apiKeys.createdAt,
			expiresAt: apiKeys.expiresAt,
		})
		.from(apiKeys)
		.where(eq(apiKeys.userId, user.id))
		.orderBy(asc(apiKeys.createdAt));
	// Map camelCase → snake_case the client ApiKeyRecord expects.
	const keys = rows.map((k) => ({
		id: k.id,
		name: k.name,
		key_prefix: k.keyPrefix ?? "",
		scopes: k.scopes ?? [],
		last_used_at: k.lastUsedAt?.toISOString() ?? null,
		created_at: k.createdAt?.toISOString() ?? "",
		expires_at: k.expiresAt?.toISOString() ?? null,
	}));
	return { keys };
});

export const Route = createFileRoute("/settings/api-keys")({
	loader: async () => {
		try {
			return await loadApiKeys();
		} catch (e) {
			if ((e as Error).message === "Unauthorized")
				throw redirect({ to: "/login" });
			throw e;
		}
	},
	head: () => ({ meta: [{ title: "API Keys - Settings" }] }),
	component: ApiKeysPage,
});

function ApiKeysPage() {
	const { keys } = Route.useLoaderData();
	return <ApiKeysClient keys={keys} />;
}
