import { requireAuth, getUserPlan } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ApiKeysForm } from "@/components/settings/api-keys-form";
import { FEATURES } from "@/types/database";
import Link from "next/link";

export default async function ApiKeysPage() {
  const user = await requireAuth();
  const plan = await getUserPlan();

  if (!FEATURES[plan].apiAccess) {
    return (
      <div
        className="rounded-xl border border-[var(--border-subtle)] p-6"
        style={{ background: "var(--bg-elevated)" }}
      >
        <h2 className="mb-4 font-fustat text-xl font-bold" style={{ color: "var(--text-primary)" }}>API Keys</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          API access hanya tersedia untuk plan <strong>Hengker</strong>.
        </p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex rounded-lg btn-primary px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
        >
          Upgrade ke Hengker
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: apiKeys } = await supabase
    .from("api_keys")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="w-full">
      <ApiKeysForm apiKeys={apiKeys || []} />
    </div>
  );
}
