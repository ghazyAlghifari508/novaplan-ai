import { ApiKeysClient } from "@/components/settings/api-keys-client";
import { createServerInsforge } from "@/lib/insforge/server";
import { requireAuth } from "@/lib/auth";

export const metadata = { title: "API Keys — Settings" };

export default async function ApiKeysPage() {
  const user = await requireAuth();
  const insforge = await createServerInsforge();

  const { data: keys } = await insforge.database
    .from("api_keys")
    .select("id, name, key_prefix, scopes, last_used_at, created_at, expires_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <ApiKeysClient keys={keys || []} />;
}
